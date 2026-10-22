// functions/src/onByteCompleted.ts
//
// Triggers on users/{uid}/dailyBytes/{byteId} writes. When a byte flips to
// completed, checks whether this user has met today's squad goal (sum of
// today's completed byte minutes >= squad.dailyGoalMinutes) for every squad
// they belong to, and updates squads/{squadId}/completions/{date} +
// streakCount server-side. Client never writes these fields directly
// (see firestore.rules — completions subcollection is write:false for clients).

import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';

const db = () => getFirestore();

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function yesterdayISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

export const onByteCompleted = onDocumentUpdated(
  'users/{uid}/dailyBytes/{byteId}',
  async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after) return;
    if (before.completed || !after.completed) return; // only act on the completion transition

    const uid = event.params.uid;
    const date = after.date as string;
    if (date !== todayISO()) return; // only today's completions count toward live streaks

    const firestore = db();

    // Sum today's completed minutes for this user across ALL their exams.
    const todaysBytesSnap = await firestore
      .collection('users').doc(uid).collection('dailyBytes')
      .where('date', '==', date)
      .where('completed', '==', true)
      .get();

    const completedMinutesToday = todaysBytesSnap.docs.reduce(
      (sum, d) => sum + (d.data().durationMinutes ?? 0),
      0
    );

    const squadsSnap = await firestore
      .collection('squads')
      .where('memberUids', 'array-contains', uid)
      .get();

    await Promise.all(
      squadsSnap.docs.map((squadDoc) =>
        updateSquadCompletion(squadDoc.id, squadDoc.data(), uid, date, completedMinutesToday)
      )
    );
  }
);

async function updateSquadCompletion(
  squadId: string,
  squad: FirebaseFirestore.DocumentData,
  uid: string,
  date: string,
  completedMinutesToday: number
): Promise<void> {
  if (completedMinutesToday < (squad.dailyGoalMinutes ?? 0)) return;

  const firestore = db();
  const completionRef = firestore.collection('squads').doc(squadId).collection('completions').doc(date);
  const squadRef = firestore.collection('squads').doc(squadId);

  await firestore.runTransaction(async (tx) => {
    const completionSnap = await tx.get(completionRef);
    const existing = completionSnap.exists
      ? (completionSnap.data() as { completedUids: string[]; allCompleted: boolean })
      : { completedUids: [], allCompleted: false };

    if (existing.completedUids.includes(uid)) return; // already recorded

    const completedUids = [...existing.completedUids, uid];
    const memberUids: string[] = squad.memberUids ?? [];
    const allCompleted = memberUids.every((m) => completedUids.includes(m));

    tx.set(completionRef, { date, completedUids, allCompleted }, { merge: true });

    if (allCompleted && !existing.allCompleted) {
      const wasStreakContinuing = squad.lastAllCompletedDate === yesterdayISO();
      const newStreak = wasStreakContinuing ? (squad.streakCount ?? 0) + 1 : 1;

      tx.update(squadRef, {
        streakCount: newStreak,
        lastAllCompletedDate: date,
      });
    }
  });

  // Notify squadmates outside the transaction — best-effort, not correctness-critical.
  const fresh = await squadRef.get();
  const freshData = fresh.data();
  if (freshData?.lastAllCompletedDate === date) {
    await notifySquad(squadId, freshData, uid);
  }
}

async function notifySquad(
  squadId: string,
  squad: FirebaseFirestore.DocumentData,
  completingUid: string
): Promise<void> {
  const firestore = db();
  const completingMember = (squad.members ?? []).find((m: { uid: string }) => m.uid === completingUid);
  const name = completingMember?.displayName ?? 'A squad member';

  const otherUids: string[] = (squad.memberUids ?? []).filter((u: string) => u !== completingUid);
  if (otherUids.length === 0) return;

  const devicesSnaps = await Promise.all(
    otherUids.map((uid) => firestore.collection('users').doc(uid).collection('devices').get())
  );
  const tokens = devicesSnaps.flatMap((snap) => snap.docs.map((d) => d.data().token as string)).filter(Boolean);
  if (tokens.length === 0) return;

  await getMessaging().sendEachForMulticast({
    tokens,
    data: {
      type: 'squadStreak',
      title: `🔥 ${squad.streakCount}-day squad streak!`,
      body: `${name} just finished today's byte — squad "${squad.name}" is still on fire.`,
      deepLink: `/squads/${squadId}`,
    },
  });
}
