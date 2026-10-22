// functions/src/joinSquad.ts
//
// Client-side firestore.rules only allow a squad's EXISTING members to
// update it — a prospective new member has no write path of their own.
// This callable bridges that gap using the Admin SDK (bypasses rules)
// after validating squad size and duplicate-membership.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const MAX_SQUAD_SIZE = 8;

interface JoinSquadRequest {
  squadId: string;
}

export const joinSquad = onCall<JoinSquadRequest>(async (request) => {
  const uid = request.auth?.uid;
  if (!uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in to join a squad.');
  }

  const { squadId } = request.data;
  if (!squadId || typeof squadId !== 'string') {
    throw new HttpsError('invalid-argument', 'squadId is required.');
  }

  const db = getFirestore();
  const squadRef = db.collection('squads').doc(squadId);

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(squadRef);
    if (!snap.exists) {
      throw new HttpsError('not-found', 'Squad does not exist.');
    }

    const data = snap.data()!;
    const memberUids: string[] = data.memberUids ?? [];

    if (memberUids.includes(uid)) {
      // Idempotent — already a member, no-op instead of erroring.
      return;
    }

    if (memberUids.length >= MAX_SQUAD_SIZE) {
      throw new HttpsError('resource-exhausted', 'Squad is full.');
    }

    const userDoc = await tx.get(db.collection('users').doc(uid));
    const displayName = userDoc.data()?.fullName ?? 'Student';
    const avatar = userDoc.data()?.avatar ?? null;

    tx.update(squadRef, {
      memberUids: FieldValue.arrayUnion(uid),
      members: FieldValue.arrayUnion({
        uid,
        displayName,
        avatar,
        joinedAt: new Date().toISOString(),
      }),
    });
  });

  return { success: true };
});
