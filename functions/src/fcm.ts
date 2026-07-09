// functions/src/fcm.ts
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';
import { db, messaging } from './admin';

export interface NotificationPayloadInput {
  title:     string;
  body:      string;
  imageUrl?: string;
  deepLink?: string;
  type?:     string;
}

export type NotificationTarget =
  | { mode: 'all' }
  | { mode: 'user'; uid: string }
  | { mode: 'segment'; field: string; value: string };

export interface DispatchResult {
  successCount:         number;
  failureCount:         number;
  invalidTokensRemoved: number;
}

const FCM_BATCH_SIZE = 500; // hard limit per sendEach call
const MAX_RETRIES = 2;
const RETRYABLE_CODES = new Set([
  'messaging/internal-error',
  'messaging/server-unavailable',
  'messaging/unknown-error',
]);
const INVALID_TOKEN_CODES = new Set([
  'messaging/registration-token-not-registered',
  'messaging/invalid-registration-token',
  'messaging/invalid-argument',
]);

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface DeviceRecord {
  uid:   string;
  token: string;
}

// ── Target resolution ────────────────────────────────────────────────────────

async function resolveDevices(target: NotificationTarget): Promise<DeviceRecord[]> {
  if (target.mode === 'all') {
    const snap = await db.collectionGroup('devices').get();
    return snap.docs
      .map(d => ({ uid: d.ref.parent.parent!.id, token: d.get('token') as string }))
      .filter(d => !!d.token);
  }

  if (target.mode === 'user') {
    const snap = await db.collection('users').doc(target.uid).collection('devices').get();
    return snap.docs
      .map(d => ({ uid: target.uid, token: d.get('token') as string }))
      .filter(d => !!d.token);
  }

  // segment: users where {field} == {value}
  const usersSnap = await db.collection('users').where(target.field, '==', target.value).get();
  const devicesPerUser = await Promise.all(
    usersSnap.docs.map(async userDoc => {
      const devSnap = await userDoc.ref.collection('devices').get();
      return devSnap.docs
        .map(d => ({ uid: userDoc.id, token: d.get('token') as string }))
        .filter(d => !!d.token);
    })
  );
  return devicesPerUser.flat();
}

// ── Invalid token cleanup ─────────────────────────────────────────────────────

async function removeInvalidToken(uid: string, token: string): Promise<void> {
  try {
    const hash = sha256Hex(token);
    await db.collection('users').doc(uid).collection('devices').doc(hash).delete();
  } catch (err) {
    console.error(`[fcm] Failed to remove invalid token for ${uid}:`, err);
  }
}

// ── Inbox fan-out (Notification Center) ──────────────────────────────────────

async function writeInboxEntries(
  uids: string[],
  payload: NotificationPayloadInput
): Promise<Map<string, string>> {
  const notificationIdByUid = new Map<string, string>();
  const CHUNK = 450; // stay under the 500-write batch limit

  for (let i = 0; i < uids.length; i += CHUNK) {
    const batch = db.batch();
    uids.slice(i, i + CHUNK).forEach(uid => {
      const ref = db.collection('users').doc(uid).collection('notifications').doc();
      notificationIdByUid.set(uid, ref.id);
      batch.set(ref, {
        title:     payload.title,
        body:      payload.body,
        imageUrl:  payload.imageUrl ?? null,
        deepLink:  payload.deepLink ?? '/',
        type:      payload.type ?? 'general',
        read:      false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
    await batch.commit();
  }

  return notificationIdByUid;
}

// ── Batched send with retry ──────────────────────────────────────────────────

async function sendBatchWithRetry(
  messages: admin.messaging.Message[],
  owners: string[]
): Promise<{ successCount: number; failureCount: number; invalid: { uid: string; token: string }[] }> {
  let successCount = 0;
  const invalid: { uid: string; token: string }[] = [];

  let pendingMessages = messages;
  let pendingOwners = owners;
  let attempt = 0;

  while (pendingMessages.length > 0 && attempt <= MAX_RETRIES) {
    const res = await messaging.sendEach(pendingMessages);
    const retryMessages: admin.messaging.Message[] = [];
    const retryOwners: string[] = [];

    res.responses.forEach((r, i) => {
      const msg = pendingMessages[i] as admin.messaging.TokenMessage;
      const uid = pendingOwners[i];

      if (r.success) {
        successCount++;
        return;
      }

      const code = r.error?.code ?? '';
      if (INVALID_TOKEN_CODES.has(code)) {
        invalid.push({ uid, token: msg.token });
      } else if (RETRYABLE_CODES.has(code) && attempt < MAX_RETRIES) {
        retryMessages.push(msg);
        retryOwners.push(uid);
      } else {
        console.error('[fcm] Permanent send failure:', code, r.error?.message);
      }
    });

    pendingMessages = retryMessages;
    pendingOwners = retryOwners;
    attempt++;
    if (pendingMessages.length > 0) await sleep(2 ** attempt * 250); // exponential backoff
  }

  return { successCount, failureCount: messages.length - successCount, invalid };
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function dispatchNotification(
  target: NotificationTarget,
  payload: NotificationPayloadInput,
  triggeredBy: string,
  campaignId?: string
): Promise<DispatchResult> {
  const devices = await resolveDevices(target);

  if (devices.length === 0) {
    const empty: DispatchResult = { successCount: 0, failureCount: 0, invalidTokensRemoved: 0 };
    await logResult(target, payload, triggeredBy, campaignId, empty);
    return empty;
  }

  const uniqueUids = Array.from(new Set(devices.map(d => d.uid)));
  const notificationIdByUid = await writeInboxEntries(uniqueUids, payload);

  const messages: admin.messaging.Message[] = [];
  const owners: string[] = [];

  devices.forEach(({ uid, token }) => {
    messages.push({
      token,
      notification: {
        title: payload.title,
        body:  payload.body,
        ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
      },
      data: {
        notificationId: notificationIdByUid.get(uid) ?? '',
        title:    payload.title,
        body:     payload.body,
        imageUrl: payload.imageUrl ?? '',
        deepLink: payload.deepLink ?? '/',
        type:     payload.type ?? 'general',
      },
     // ── SYSTEM COMPLIANT MAXIMUM URGENCY DELIVERY CONFIG ──
      android: {
        priority: 'high', // Tells Google FCM to wake up the device instantly
        notification: {
          channelId: 'studibyte_alerts', // MUST match the channel ID Claude created on your frontend!
          sound: 'default',
          visibility: 'public',
        },
      },
      apns: {
        headers: {
          'apns-priority': '10', // Triggers immediate screen wake-up and banner on iOS
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body:  payload.body,
            },
            sound: 'default',
          },
        },
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        fcmOptions: { link: payload.deepLink ?? '/' },
      },
    });
    owners.push(uid);
  });

  let successCount = 0;
  let failureCount = 0;
  const invalidAll: { uid: string; token: string }[] = [];

  for (let i = 0; i < messages.length; i += FCM_BATCH_SIZE) {
    const chunkMessages = messages.slice(i, i + FCM_BATCH_SIZE);
    const chunkOwners = owners.slice(i, i + FCM_BATCH_SIZE);
    const { successCount: s, failureCount: f, invalid } = await sendBatchWithRetry(chunkMessages, chunkOwners);
    successCount += s;
    failureCount += f;
    invalidAll.push(...invalid);
  }

  await Promise.all(invalidAll.map(d => removeInvalidToken(d.uid, d.token)));

  const result: DispatchResult = {
    successCount,
    failureCount,
    invalidTokensRemoved: invalidAll.length,
  };

  await logResult(target, payload, triggeredBy, campaignId, result);
  return result;
}

async function logResult(
  target: NotificationTarget,
  payload: NotificationPayloadInput,
  triggeredBy: string,
  campaignId: string | undefined,
  result: DispatchResult
): Promise<void> {
  console.log('[fcm] Dispatch complete', { target, triggeredBy, campaignId, ...result });

  const sanitizedPayload = {
    title:    payload.title,
    body:     payload.body,
    imageUrl: payload.imageUrl ?? null, 
    deepLink: payload.deepLink ?? '/',
    type:     payload.type ?? 'general',
  };

  await db.collection('notificationLogs').add({
    target,
    payload: sanitizedPayload,
    triggeredBy,
    campaignId: campaignId ?? null,
    ...result,
    sentAt: admin.firestore.FieldValue.serverTimestamp(),
  });
}