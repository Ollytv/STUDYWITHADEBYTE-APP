"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Timestamp = exports.FieldValue = exports.messaging = exports.db = void 0;
exports.requireAdmin = requireAdmin;
// functions/src/admin.ts
const app_1 = require("firebase-admin/app");
const firestore_1 = require("firebase-admin/firestore");
Object.defineProperty(exports, "FieldValue", { enumerable: true, get: function () { return firestore_1.FieldValue; } });
Object.defineProperty(exports, "Timestamp", { enumerable: true, get: function () { return firestore_1.Timestamp; } });
const messaging_1 = require("firebase-admin/messaging");
const https_1 = require("firebase-functions/v2/https");
if ((0, app_1.getApps)().length === 0) {
    (0, app_1.initializeApp)();
}
exports.db = (0, firestore_1.getFirestore)();
exports.messaging = (0, messaging_1.getMessaging)();
/**
 * Throws HttpsError unless the caller is signed in AND has a doc under
 * admins/{uid}. Firestore allowlist is used instead of custom claims because
 * this project doesn't set custom claims anywhere — the allowlist needs no
 * manual claim-setting script, just adding a doc via the Firebase Console
 * (see deployment notes). This is the actual security boundary: the client
 * check in src/services/adminAuth.ts is UI-only and can't be trusted.
 */
async function requireAdmin(request) {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Sign-in required.');
    }
    const snap = await exports.db.collection('admins').doc(request.auth.uid).get();
    if (!snap.exists) {
        throw new https_1.HttpsError('permission-denied', 'Admin privileges required.');
    }
    return request.auth.uid;
}
//# sourceMappingURL=admin.js.map