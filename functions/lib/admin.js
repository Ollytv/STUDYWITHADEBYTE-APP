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
exports.messaging = exports.db = void 0;
exports.requireAdmin = requireAdmin;
// functions/src/admin.ts
const admin = __importStar(require("firebase-admin"));
const https_1 = require("firebase-functions/v2/https");
if (admin.apps.length === 0) {
    admin.initializeApp();
}
exports.db = admin.firestore();
exports.messaging = admin.messaging();
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