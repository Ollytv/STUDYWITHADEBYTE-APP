"use strict";
// functions/src/getSquadPreview.ts
//
// firestore.rules only allow squad reads to existing members, so a
// prospective joiner following an invite link has no way to see even the
// squad's name before joining. This callable exposes a deliberately minimal,
// non-sensitive preview (name + member count) via the Admin SDK.
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSquadPreview = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const MAX_SQUAD_SIZE = 8;
exports.getSquadPreview = (0, https_1.onCall)(async (request) => {
    if (!request.auth?.uid) {
        throw new https_1.HttpsError('unauthenticated', 'Must be signed in.');
    }
    const { squadId } = request.data;
    if (!squadId || typeof squadId !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'squadId is required.');
    }
    const snap = await (0, firestore_1.getFirestore)().collection('squads').doc(squadId).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('not-found', 'This squad invite is no longer valid.');
    }
    const data = snap.data();
    const memberCount = (data.memberUids ?? []).length;
    return {
        name: data.name,
        memberCount,
        dailyGoalMinutes: data.dailyGoalMinutes,
        isFull: memberCount >= MAX_SQUAD_SIZE,
    };
});
//# sourceMappingURL=getSquadPreview.js.map