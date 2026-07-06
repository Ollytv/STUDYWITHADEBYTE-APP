// functions/src/admin.ts
import * as admin from 'firebase-admin';
import { HttpsError, CallableRequest } from 'firebase-functions/v2/https';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

export const db        = admin.firestore();
export const messaging = admin.messaging();

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