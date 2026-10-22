// functions/src/getSquadPreview.ts
//
// firestore.rules only allow squad reads to existing members, so a
// prospective joiner following an invite link has no way to see even the
// squad's name before joining. This callable exposes a deliberately minimal,
// non-sensitive preview (name + member count) via the Admin SDK.

import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';

interface GetSquadPreviewRequest {
  squadId: string;
}

interface SquadPreview {
  name: string;
  memberCount: number;
  dailyGoalMinutes: number;
  isFull: boolean;
}

const MAX_SQUAD_SIZE = 8;

export const getSquadPreview = onCall<GetSquadPreviewRequest, Promise<SquadPreview>>(async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.');
  }

  const { squadId } = request.data;
  if (!squadId || typeof squadId !== 'string') {
    throw new HttpsError('invalid-argument', 'squadId is required.');
  }

  const snap = await getFirestore().collection('squads').doc(squadId).get();
  if (!snap.exists) {
    throw new HttpsError('not-found', 'This squad invite is no longer valid.');
  }

  const data = snap.data()!;
  const memberCount = (data.memberUids ?? []).length;

  return {
    name: data.name,
    memberCount,
    dailyGoalMinutes: data.dailyGoalMinutes,
    isFull: memberCount >= MAX_SQUAD_SIZE,
  };
});
