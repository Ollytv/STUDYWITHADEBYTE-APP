// functions/src/admin.ts
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

if (getApps().length === 0) {
  initializeApp();
}

export const db        = getFirestore();
export const messaging = getMessaging();

// Re-exported so other modules don't need their own firebase-admin/firestore imports.
export { FieldValue, Timestamp };

/**
 * Throws HttpsError unless the caller is signed in AND has a doc under
 * admins/{uid}. Firestore allowlist is used instead of custom claims because
 * this project doesn't set custom claims anywhere — the allowlist needs no
 * manual claim-setting script, just adding a doc via the Firebase Console
 * (see deployment notes). This is the actual security boundary: the client
 * check in src/services/adminAuth.ts is UI-only and can't be trusted.
 */
export async function requireAdmin(request: CallableRequest): Promise<string> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Sign-in required.');
  }
  const snap = await db.collection('admins').doc(request.auth.uid).get();
  if (!snap.exists) {
    throw new HttpsError('permission-denied', 'Admin privileges required.');
  }
  return request.auth.uid;
}