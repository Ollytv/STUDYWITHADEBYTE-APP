"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToSegment = exports.sendNotificationToUser = exports.sendNotificationToAll = void 0;
// functions/src/callable.ts
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const fcm_1 = require("./fcm");
const MAX_TITLE_LEN = 120;
const MAX_BODY_LEN = 500;
function validatePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'payload is required.');
    }
    const p = payload;
    if (typeof p.title !== 'string' || p.title.trim().length === 0 || p.title.length > MAX_TITLE_LEN) {
        throw new https_1.HttpsError('invalid-argument', `title must be a non-empty string ≤ ${MAX_TITLE_LEN} chars.`);
    }
    if (typeof p.body !== 'string' || p.body.trim().length === 0 || p.body.length > MAX_BODY_LEN) {
        throw new https_1.HttpsError('invalid-argument', `body must be a non-empty string ≤ ${MAX_BODY_LEN} chars.`);
    }
    if (p.imageUrl !== undefined && (typeof p.imageUrl !== 'string' || !/^https:\/\//.test(p.imageUrl))) {
        throw new https_1.HttpsError('invalid-argument', 'imageUrl must be an https:// URL.');
    }
    if (p.deepLink !== undefined && typeof p.deepLink !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'deepLink must be a string.');
    }
    if (p.type !== undefined && typeof p.type !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'type must be a string.');
    }
    return {
        title: p.title.trim(),
        body: p.body.trim(),
        imageUrl: p.imageUrl,
        deepLink: p.deepLink || '/',
        type: p.type || 'general',
    };
}
exports.sendNotificationToAll = (0, https_1.onCall)(async (request) => {
    const uid = await (0, admin_1.requireAdmin)(request);
    const payload = validatePayload(request.data?.payload);
    return (0, fcm_1.dispatchNotification)({ mode: 'all' }, payload, uid);
});
exports.sendNotificationToUser = (0, https_1.onCall)(async (request) => {
    const uid = await (0, admin_1.requireAdmin)(request);
    const targetUid = request.data?.uid;
    if (typeof targetUid !== 'string' || targetUid.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'uid is required.');
    }
    const payload = validatePayload(request.data?.payload);
    return (0, fcm_1.dispatchNotification)({ mode: 'user', uid: targetUid }, payload, uid);
});
exports.sendNotificationToSegment = (0, https_1.onCall)(async (request) => {
    const uid = await (0, admin_1.requireAdmin)(request);
    const field = request.data?.field;
    const value = request.data?.value;
    if (typeof field !== 'string' || field.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'field is required.');
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'value is required.');
    }
    const payload = validatePayload(request.data?.payload);
    return (0, fcm_1.dispatchNotification)({ mode: 'segment', field, value }, payload, uid);
});
//# sourceMappingURL=callable.js.map