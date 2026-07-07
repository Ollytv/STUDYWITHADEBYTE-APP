// src/services/notificationAdmin.ts
//
// Client-side wrapper for the admin notification-sending Cloud Functions.
// All actual send/fan-out/token-cleanup logic lives server-side
// (functions/src/fcm.ts, callable.ts) — this module never touches tokens
// directly and never talks to FCM itself. The Cloud Functions re-verify the
// caller's admin custom claim server-side; the UI-level admin check here is
// purely cosmetic (route guarding), never a security boundary.

import { httpsCallable } from 'firebase/functions';
import {
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { functions, db, auth } from './firebase';

export type NotificationTarget =
  | { mode: 'all' }
  | { mode: 'user'; uid: string }
  | { mode: 'segment'; field: string; value: string };

export interface NotificationPayloadInput {
  title:      string;
  body:       string;
  imageUrl?:  string;
  deepLink?:  string;
  type?:      string;
}

export interface SendResult {
  successCount: number;
  failureCount: number;
  invalidTokensRemoved: number;
}

/**
 * Strips optional fields that are empty/whitespace so they're omitted from
 * the payload entirely — never sent as `undefined`, since httpsCallable's
 * transport serializes `undefined` values as `null`, not as an absent key,
 * which then fails the Cloud Function's `!== undefined` checks.
 */
function sanitizePayload(payload: NotificationPayloadInput): NotificationPayloadInput {
  const clean: NotificationPayloadInput = {
    title: payload.title.trim(),
    body: payload.body.trim(),
    deepLink: payload.deepLink?.trim() || '/',
    type: payload.type?.trim() || 'general',
  };
  if (payload.imageUrl?.trim()) clean.imageUrl = payload.imageUrl.trim();
  return clean;
}

const sendToAllFn     = httpsCallable<{ payload: NotificationPayloadInput }, SendResult>(functions, 'sendNotificationToAll');
const sendToUserFn    = httpsCallable<{ uid: string; payload: NotificationPayloadInput }, SendResult>(functions, 'sendNotificationToUser');
const sendToSegmentFn = httpsCallable<{ field: string; value: string; payload: NotificationPayloadInput }, SendResult>(functions, 'sendNotificationToSegment');

/**
 * Sends immediately (target = all / single user / segment). Throws on
 * failure — callers should surface functions/permission-denied etc. to the UI.
 */

 export async function sendNotificationNow(
  target: NotificationTarget,
  payload: NotificationPayloadInput
): Promise<SendResult> {
  payload = sanitizePayload(payload);   // ← ADD THIS LINE
  if (target.mode === 'all') {
    const res = await sendToAllFn({ payload });
    return res.data;
  }
  if (target.mode === 'user') {
    const res = await sendToUserFn({ uid: target.uid, payload });
    return res.data;
  }
  const res = await sendToSegmentFn({ field: target.field, value: target.value, payload });
  return res.data;
}

/**
 * Creates a pending campaign doc for a future send. A scheduled Cloud
 * Function (functions/src/scheduled.ts) polls for due campaigns and sends
 * them via the same fan-out path as immediate sends.
 */
export async function scheduleNotificationCampaign(
  target: NotificationTarget,
  payload: NotificationPayloadInput,
  scheduledAt: Date
): Promise<string> {
  payload = sanitizePayload(payload);   // ← ADD THIS LINE
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');

  const ref = await addDoc(collection(db, 'notificationCampaigns'), {
    target,
    payload,
    scheduledAt: Timestamp.fromDate(scheduledAt),
    status: 'pending',
    createdBy: user.uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}
