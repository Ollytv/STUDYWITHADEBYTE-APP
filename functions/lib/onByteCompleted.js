"use strict";
// functions/src/onByteCompleted.ts
//
// Triggers on users/{uid}/dailyBytes/{byteId} writes. When a byte flips to
// completed, checks whether this user has met today's squad goal (sum of
// today's completed byte minutes >= squad.dailyGoalMinutes) for every squad
// they belong to, and updates squads/{squadId}/completions/{date} +
// streakCount server-side. Client never writes these fields directly
// (see firestore.rules — completions subcollection is write:false for clients).
Object.defineProperty(exports, "__esModule", { value: true });
exports.onByteCompleted = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const messaging_1 = require("firebase-admin/messaging");
const db = () => (0, firestore_2.getFirestore)();
function todayISO() {
    return new Date().toISOString().split('T')[0];
}
function yesterdayISO() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
}
exports.onByteCompleted = (0, firestore_1.onDocumentUpdated)('users/{uid}/dailyBytes/{byteId}', async (event) => {
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    if (!before || !after)
        return;
    if (before.completed || !after.completed)
        return; // only act on the completion transition
    const uid = event.params.uid;
    const date = after.date;
    if (date !== todayISO())
        return; // only today's completions count toward live streaks
    const firestore = db();
    // Sum today's completed minutes for this user across ALL their exams.
    const todaysBytesSnap = await firestore
        .collection('users').doc(uid).collection('dailyBytes')
        .where('date', '==', date)
        .where('completed', '==', true)
        .get();
    const completedMinutesToday = todaysBytesSnap.docs.reduce((sum, d) => sum + (d.data().durationMinutes ?? 0), 0);
    const squadsSnap = await firestore
        .collection('squads')
        .where('memberUids', 'array-contains', uid)
        .get();
    await Promise.all(squadsSnap.docs.map((squadDoc) => updateSquadCompletion(squadDoc.id, squadDoc.data(), uid, date, completedMinutesToday)));
});
async function updateSquadCompletion(squadId, squad, uid, date, completedMinutesToday) {
    if (completedMinutesToday < (squad.dailyGoalMinutes ?? 0))
        return;
    const firestore = db();
    const completionRef = firestore.collection('squads').doc(squadId).collection('completions').doc(date);
    const squadRef = firestore.collection('squads').doc(squadId);
    await firestore.runTransaction(async (tx) => {
        const completionSnap = await tx.get(completionRef);
        const existing = completionSnap.exists
            ? completionSnap.data()
            : { completedUids: [], allCompleted: false };
        if (existing.completedUids.includes(uid))
            return; // already recorded
        const completedUids = [...existing.completedUids, uid];
        const memberUids = squad.memberUids ?? [];
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
async function notifySquad(squadId, squad, completingUid) {
    const firestore = db();
    const completingMember = (squad.members ?? []).find((m) => m.uid === completingUid);
    const name = completingMember?.displayName ?? 'A squad member';
    const otherUids = (squad.memberUids ?? []).filter((u) => u !== completingUid);
    if (otherUids.length === 0)
        return;
    const devicesSnaps = await Promise.all(otherUids.map((uid) => firestore.collection('users').doc(uid).collection('devices').get()));
    const tokens = devicesSnaps.flatMap((snap) => snap.docs.map((d) => d.data().token)).filter(Boolean);
    if (tokens.length === 0)
        return;
    await (0, messaging_1.getMessaging)().sendEachForMulticast({
        tokens,
        data: {
            type: 'squadStreak',
            title: `🔥 ${squad.streakCount}-day squad streak!`,
            body: `${name} just finished today's byte — squad "${squad.name}" is still on fire.`,
            deepLink: `/squads/${squadId}`,
        },
    });
}
//# sourceMappingURL=onByteCompleted.js.map