"use strict";
// src/services/notificationAdmin.ts
//
// Client-side wrapper for the admin notification-sending Cloud Functions.
// All actual send/fan-out/token-cleanup logic lives server-side
// (functions/src/fcm.ts, callable.ts) — this module never touches tokens
// directly and never talks to FCM itself. The Cloud Functions re-verify the
// caller's admin custom claim server-side; the UI-level admin check here is
// purely cosmetic (route guarding), never a security boundary.
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationNow = sendNotificationNow;
exports.scheduleNotificationCampaign = scheduleNotificationCampaign;
const functions_1 = require("firebase/functions");
const firestore_1 = require("firebase/firestore");
const firebase_1 = require("./firebase");
const sendToAllFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'sendNotificationToAll');
const sendToUserFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'sendNotificationToUser');
const sendToSegmentFn = (0, functions_1.httpsCallable)(firebase_1.functions, 'sendNotificationToSegment');
/**
 * Sends immediately (target = all / single user / segment). Throws on
 * failure — callers should surface functions/permission-denied etc. to the UI.
 */
async function sendNotificationNow(target, payload) {
    if (target.mode === 'all') {
        const res = await sendToAllFn({ payload });
        return res.data;
    }
    if (target.mode === 'user') {
        const res = await sendToUserFn({ uid: target.uid, payload });
        return res.data;
    }
    const res = await sendToSegmentFn({ field: target.field, value: target.value, payload });
    return res.data;
}
/**
 * Creates a pending campaign doc for a future send. A scheduled Cloud
 * Function (functions/src/scheduled.ts) polls for due campaigns and sends
 * them via the same fan-out path as immediate sends.
 */
async function scheduleNotificationCampaign(target, payload, scheduledAt) {
    const user = firebase_1.auth.currentUser;
    if (!user)
        throw new Error('Not authenticated');
    const ref = await (0, firestore_1.addDoc)((0, firestore_1.collection)(firebase_1.db, 'notificationCampaigns'), {
        target,
        payload,
        scheduledAt: firestore_1.Timestamp.fromDate(scheduledAt),
        status: 'pending',
        createdBy: user.uid,
        createdAt: (0, firestore_1.serverTimestamp)(),
    });
    return ref.id;
}
//# sourceMappingURL=notificationAdmin.js.map