"use strict";
// functions/src/joinSquad.ts
//
// Client-side firestore.rules only allow a squad's EXISTING members to
// update it — a prospective new member has no write path of their own.
// This callable bridges that gap using the Admin SDK (bypasses rules)
// after validating squad size and duplicate-membership.
Object.defineProperty(exports, "__esModule", { value: true });
exports.joinSquad = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const MAX_SQUAD_SIZE = 8;
exports.joinSquad = (0, https_1.onCall)(async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in to join a squad.');
    }
    const { squadId } = request.data;
    if (!squadId || typeof squadId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'squadId is required.');
    }
    const db = (0, firestore_1.getFirestore)();
    const squadRef = db.collection('squads').doc(squadId);
    await db.runTransaction(async (tx) => {
        const snap = await tx.get(squadRef);
        if (!snap.exists) {
            throw new https_1.HttpsError('not-found', 'Squad does not exist.');
        }
        const data = snap.data();
        const memberUids = data.memberUids ?? [];
        if (memberUids.includes(uid)) {
            // Idempotent — already a member, no-op instead of erroring.
            return;
        }
        if (memberUids.length >= MAX_SQUAD_SIZE) {
            throw new https_1.HttpsError('resource-exhausted', 'Squad is full.');
        }
        const userDoc = await tx.get(db.collection('users').doc(uid));
        const displayName = userDoc.data()?.fullName ?? 'Student';
        const avatar = userDoc.data()?.avatar ?? null;
        tx.update(squadRef, {
            memberUids: firestore_1.FieldValue.arrayUnion(uid),
            members: firestore_1.FieldValue.arrayUnion({
                uid,
                displayName,
                avatar,
                joinedAt: new Date().toISOString(),
            }),
        });
    });
    return { success: true };
});
//# sourceMappingURL=joinSquad.js.map