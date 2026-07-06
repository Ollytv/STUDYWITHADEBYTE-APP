// src/services/adminAuth.ts
//
// Firestore-allowlist admin check. Chosen over Firebase custom claims because
// this project doesn't set any custom claims anywhere yet — the allowlist
// needs no manual claim-setting script, just a doc under `admins/{uid}`.
// The Cloud Functions (functions/src/admin.ts) re-verify the same collection
// server-side via the Admin SDK; this client-side check is UI-only and is
// never the actual security boundary.

import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export async function checkIsAdmin(uid: string): Promise<boolean> {
  try {
    const snap = await getDoc(doc(db, 'admins', uid));
    return snap.exists();
  } catch (err) {
    console.error('[adminAuth] Failed to check admin status:', err);
    return false;
  }
}
