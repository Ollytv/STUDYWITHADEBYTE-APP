"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.dispatchNotification = dispatchNotification;
// functions/src/fcm.ts
const admin = __importStar(require("firebase-admin"));
const crypto = __importStar(require("crypto"));
const admin_1 = require("./admin");
const FCM_BATCH_SIZE = 500; // hard limit per sendEach call
const MAX_RETRIES = 2;
const RETRYABLE_CODES = new Set([
    'messaging/internal-error',
    'messaging/server-unavailable',
    'messaging/unknown-error',
]);
const INVALID_TOKEN_CODES = new Set([
    'messaging/registration-token-not-registered',
    'messaging/invalid-registration-token',
    'messaging/invalid-argument',
]);
function sha256Hex(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// ── Target resolution ────────────────────────────────────────────────────────
async function resolveDevices(target) {
    if (target.mode === 'all') {
        const snap = await admin_1.db.collectionGroup('devices').get();
        return snap.docs
            .map(d => ({ uid: d.ref.parent.parent.id, token: d.get('token') }))
            .filter(d => !!d.token);
    }
    if (target.mode === 'user') {
        const snap = await admin_1.db.collection('users').doc(target.uid).collection('devices').get();
        return snap.docs
            .map(d => ({ uid: target.uid, token: d.get('token') }))
            .filter(d => !!d.token);
    }
    // segment: users where {field} == {value}
    const usersSnap = await admin_1.db.collection('users').where(target.field, '==', target.value).get();
    const devicesPerUser = await Promise.all(usersSnap.docs.map(async (userDoc) => {
        const devSnap = await userDoc.ref.collection('devices').get();
        return devSnap.docs
            .map(d => ({ uid: userDoc.id, token: d.get('token') }))
            .filter(d => !!d.token);
    }));
    return devicesPerUser.flat();
}
// ── Invalid token cleanup ─────────────────────────────────────────────────────
async function removeInvalidToken(uid, token) {
    try {
        const hash = sha256Hex(token);
        await admin_1.db.collection('users').doc(uid).collection('devices').doc(hash).delete();
    }
    catch (err) {
        console.error(`[fcm] Failed to remove invalid token for ${uid}:`, err);
    }
}
// ── Inbox fan-out (Notification Center) ──────────────────────────────────────
async function writeInboxEntries(uids, payload) {
    const notificationIdByUid = new Map();
    const CHUNK = 450; // stay under the 500-write batch limit
    for (let i = 0; i < uids.length; i += CHUNK) {
        const batch = admin_1.db.batch();
        uids.slice(i, i + CHUNK).forEach(uid => {
            const ref = admin_1.db.collection('users').doc(uid).collection('notifications').doc();
            notificationIdByUid.set(uid, ref.id);
            batch.set(ref, {
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl ?? null,
                deepLink: payload.deepLink ?? '/',
                type: payload.type ?? 'general',
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        });
        await batch.commit();
    }
    return notificationIdByUid;
}
// ── Batched send with retry ──────────────────────────────────────────────────
async function sendBatchWithRetry(messages, owners) {
    let successCount = 0;
    const invalid = [];
    let pendingMessages = messages;
    let pendingOwners = owners;
    let attempt = 0;
    while (pendingMessages.length > 0 && attempt <= MAX_RETRIES) {
        const res = await admin_1.messaging.sendEach(pendingMessages);
        const retryMessages = [];
        const retryOwners = [];
        res.responses.forEach((r, i) => {
            const msg = pendingMessages[i];
            const uid = pendingOwners[i];
            if (r.success) {
                successCount++;
                return;
            }
            const code = r.error?.code ?? '';
            if (INVALID_TOKEN_CODES.has(code)) {
                invalid.push({ uid, token: msg.token });
            }
            else if (RETRYABLE_CODES.has(code) && attempt < MAX_RETRIES) {
                retryMessages.push(msg);
                retryOwners.push(uid);
            }
            else {
                console.error('[fcm] Permanent send failure:', code, r.error?.message);
            }
        });
        pendingMessages = retryMessages;
        pendingOwners = retryOwners;
        attempt++;
        if (pendingMessages.length > 0)
            await sleep(2 ** attempt * 250); // exponential backoff
    }
    return { successCount, failureCount: messages.length - successCount, invalid };
}
// ── Public entry point ────────────────────────────────────────────────────────
async function dispatchNotification(target, payload, triggeredBy, campaignId) {
    const devices = await resolveDevices(target);
    if (devices.length === 0) {
        const empty = { successCount: 0, failureCount: 0, invalidTokensRemoved: 0 };
        await logResult(target, payload, triggeredBy, campaignId, empty);
        return empty;
    }
    const uniqueUids = Array.from(new Set(devices.map(d => d.uid)));
    const notificationIdByUid = await writeInboxEntries(uniqueUids, payload);
    const messages = [];
    const owners = [];
    devices.forEach(({ uid, token }) => {
        messages.push({
            token,
            notification: {
                title: payload.title,
                body: payload.body,
                ...(payload.imageUrl ? { imageUrl: payload.imageUrl } : {}),
            },
            data: {
                notificationId: notificationIdByUid.get(uid) ?? '',
                title: payload.title,
                body: payload.body,
                imageUrl: payload.imageUrl ?? '',
                deepLink: payload.deepLink ?? '/',
                type: payload.type ?? 'general',
            },
            // ── SYSTEM COMPLIANT MAXIMUM URGENCY DELIVERY CONFIG ──
            android: {
                priority: 'high', // Tells Google FCM to wake up the device instantly
                notification: {
                    channelId: 'studibyte_alerts', // MUST match the channel ID Claude created on your frontend!
                    sound: 'default',
                    visibility: 'public',
                },
            },
            apns: {
                headers: {
                    'apns-priority': '10', // Triggers immediate screen wake-up and banner on iOS
                },
                payload: {
                    aps: {
                        alert: {
                            title: payload.title,
                            body: payload.body,
                        },
                        sound: 'default',
                    },
                },
            },
            webpush: {
                headers: {
                    Urgency: 'high',
                },
                fcmOptions: { link: payload.deepLink ?? '/' },
            },
        });
        owners.push(uid);
    });
    let successCount = 0;
    let failureCount = 0;
    const invalidAll = [];
    for (let i = 0; i < messages.length; i += FCM_BATCH_SIZE) {
        const chunkMessages = messages.slice(i, i + FCM_BATCH_SIZE);
        const chunkOwners = owners.slice(i, i + FCM_BATCH_SIZE);
        const { successCount: s, failureCount: f, invalid } = await sendBatchWithRetry(chunkMessages, chunkOwners);
        successCount += s;
        failureCount += f;
        invalidAll.push(...invalid);
    }
    await Promise.all(invalidAll.map(d => removeInvalidToken(d.uid, d.token)));
    const result = {
        successCount,
        failureCount,
        invalidTokensRemoved: invalidAll.length,
    };
    await logResult(target, payload, triggeredBy, campaignId, result);
    return result;
}
async function logResult(target, payload, triggeredBy, campaignId, result) {
    console.log('[fcm] Dispatch complete', { target, triggeredBy, campaignId, ...result });
    const sanitizedPayload = {
        title: payload.title,
        body: payload.body,
        imageUrl: payload.imageUrl ?? null,
        deepLink: payload.deepLink ?? '/',
        type: payload.type ?? 'general',
    };
    await admin_1.db.collection('notificationLogs').add({
        target,
        payload: sanitizedPayload,
        triggeredBy,
        campaignId: campaignId ?? null,
        ...result,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
}
//# sourceMappingURL=fcm.js.map