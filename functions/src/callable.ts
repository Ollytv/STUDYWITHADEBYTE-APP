// functions/src/callable.ts
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { requireAdmin } from './admin';
import { dispatchNotification, NotificationPayloadInput } from './fcm';

const MAX_TITLE_LEN = 120;
const MAX_BODY_LEN = 500;

function validatePayload(payload: unknown): NotificationPayloadInput {
  if (!payload || typeof payload !== 'object') {
    throw new HttpsError('invalid-argument', 'payload is required.');
  }
  const p = payload as Record<string, unknown>;

  if (typeof p.title !== 'string' || p.title.trim().length === 0 || p.title.length > MAX_TITLE_LEN) {
    throw new HttpsError('invalid-argument', `title must be a non-empty string ≤ ${MAX_TITLE_LEN} chars.`);
  }
  if (typeof p.body !== 'string' || p.body.trim().length === 0 || p.body.length > MAX_BODY_LEN) {
    throw new HttpsError('invalid-argument', `body must be a non-empty string ≤ ${MAX_BODY_LEN} chars.`);
  }
  if (p.imageUrl != null && (typeof p.imageUrl !== 'string' || !/^https:\/\//.test(p.imageUrl))) {
    throw new HttpsError('invalid-argument', 'imageUrl must be an https:// URL.');
  }
  
  }
  if (p.deepLink !== undefined && typeof p.deepLink !== 'string') {
    throw new HttpsError('invalid-argument', 'deepLink must be a string.');
  }
  if (p.type !== undefined && typeof p.type !== 'string') {
    throw new HttpsError('invalid-argument', 'type must be a string.');
  }

  return {
    title:    p.title.trim(),
    body:     p.body.trim(),
    imageUrl: p.imageUrl as string | undefined,
    deepLink: (p.deepLink as string | undefined) || '/',
    type:     (p.type as string | undefined) || 'general',
  };
}

export const sendNotificationToAll = onCall(async (request) => {
  const uid = await requireAdmin(request);
  const payload = validatePayload(request.data?.payload);
  return dispatchNotification({ mode: 'all' }, payload, uid);
});

export const sendNotificationToUser = onCall(async (request) => {
  const uid = await requireAdmin(request);
  const targetUid = request.data?.uid;
  if (typeof targetUid !== 'string' || targetUid.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'uid is required.');
  }
  const payload = validatePayload(request.data?.payload);
  return dispatchNotification({ mode: 'user', uid: targetUid }, payload, uid);
});

export const sendNotificationToSegment = onCall(async (request) => {
  const uid = await requireAdmin(request);
  const field = request.data?.field;
  const value = request.data?.value;
  if (typeof field !== 'string' || field.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'field is required.');
  }
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new HttpsError('invalid-argument', 'value is required.');
  }
  const payload = validatePayload(request.data?.payload);
  return dispatchNotification({ mode: 'segment', field, value }, payload, uid);
});