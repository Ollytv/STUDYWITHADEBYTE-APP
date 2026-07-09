"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotificationToSegment = exports.sendNotificationToUser = exports.sendNotificationToAll = void 0;
// functions/src/callable.ts
const https_1 = require("firebase-functions/v2/https");
const admin_1 = require("./admin");
const fcm_1 = require("./fcm");
const MAX_TITLE_LEN = 120;
const MAX_BODY_LEN = 500;
/**
 * Deeply strips `undefined` values from an object/array so it's safe to pass
 * to any Firestore write (`.set()`, `.update()`, batch writes, etc). Firestore
 * throws FAILED_PRECONDITION on any `undefined` field, even nested ones —
 * `null` is fine, `undefined` is not. This walks the whole structure rather
 * than just the top level, since the payload gets nested inside campaign and
 * log documents downstream in fcm.ts.
 */
function removeUndefinedFields(value) {
    if (Array.isArray(value)) {
        return value.map(removeUndefinedFields);
    }
    if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
        const cleaned = {};
        for (const [key, val] of Object.entries(value)) {
            if (val === undefined)
                continue; // drop the key entirely, don't keep it as undefined
            cleaned[key] = removeUndefinedFields(val);
        }
        return cleaned;
    }
    return value;
}
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
    // imageUrl is optional. Treat undefined, null, and empty/whitespace-only
    // strings all as "not provided" — only validate the https:// format when a
    // real value was actually sent.
    const rawImageUrl = typeof p.imageUrl === 'string' ? p.imageUrl.trim() : '';
    if (p.imageUrl != null && rawImageUrl !== '' && !/^https:\/\//.test(rawImageUrl)) {
        throw new https_1.HttpsError('invalid-argument', 'imageUrl must be an https:// URL.');
    }
    if (p.imageUrl != null && p.imageUrl !== '' && typeof p.imageUrl !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'imageUrl must be a string.');
    }
    if (p.deepLink !== undefined && typeof p.deepLink !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'deepLink must be a string.');
    }
    if (p.type !== undefined && typeof p.type !== 'string') {
        throw new https_1.HttpsError('invalid-argument', 'type must be a string.');
    }
    // Build the result WITHOUT ever assigning `imageUrl: undefined` — the key
    // is only added when a real, validated, non-empty value exists.
    const result = {
        title: p.title.trim(),
        body: p.body.trim(),
        deepLink: p.deepLink?.trim() || '/',
        type: p.type?.trim() || 'general',
    };
    if (rawImageUrl !== '') {
        result.imageUrl = rawImageUrl;
    }
    // Second, structural line of defence — catches anything the above missed,
    // and protects every downstream Firestore write in fcm.ts.
    return removeUndefinedFields(result);
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