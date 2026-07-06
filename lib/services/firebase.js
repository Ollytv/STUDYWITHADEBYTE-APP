"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagingPromise = exports.analytics = exports.functions = exports.storage = exports.db = exports.auth = void 0;
// src/services/firebase.ts
const app_1 = require("firebase/app");
const auth_1 = require("firebase/auth");
const firestore_1 = require("firebase/firestore");
const storage_1 = require("firebase/storage");
const analytics_1 = require("firebase/analytics");
const messaging_1 = require("firebase/messaging");
const functions_1 = require("firebase/functions");
// ── Environment variable validation ──────────────────────────────────────────
// Fail loudly at startup if any required variable is missing.
// This catches misconfigured deployments before any Firebase call is made.
const REQUIRED_ENV_VARS = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
];
const missing = REQUIRED_ENV_VARS.filter(key => !import.meta.env[key] || import.meta.env[key] === '');
if (missing.length > 0) {
    throw new Error(`[Firebase] Missing required environment variables: ${missing.join(', ')}. ` +
        'Check your .env file and Netlify environment variable settings.');
}
// ── Firebase config — all values from environment variables ──────────────────
// Keys are intentionally NOT hardcoded. See .env / Netlify dashboard.
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};
const app = (0, app_1.initializeApp)(firebaseConfig);
exports.auth = (0, auth_1.getAuth)(app);
exports.db = (0, firestore_1.getFirestore)(app);
exports.storage = (0, storage_1.getStorage)(app);
exports.functions = (0, functions_1.getFunctions)(app);
// Analytics only runs in a real browser context (not SSR, not Node test runners)
exports.analytics = typeof window !== 'undefined' ? (0, analytics_1.getAnalytics)(app) : null;
// ── FCM messaging ─────────────────────────────────────────────────────────────
// FCM is only supported in secure contexts (HTTPS / localhost) with a real
// browser. isSupported() is async and returns false in SSR, Node, Firefox
// private browsing, and some older WebViews. Exporting a promise lets callers
// gracefully skip notification features when unsupported.
exports.messagingPromise = (async () => {
    try {
        const supported = await (0, messaging_1.isSupported)();
        if (!supported)
            return null;
        return (0, messaging_1.getMessaging)(app);
    }
    catch {
        // Never throw — notification support is a progressive enhancement
        return null;
    }
})();
// ── Offline persistence ───────────────────────────────────────────────────────
// Enables Firestore to serve cached data when the device is offline.
// Errors here are non-fatal — the app works fine without persistence.
(0, firestore_1.enableIndexedDbPersistence)(exports.db).catch((err) => {
    if (err.code === 'failed-precondition') {
        // Happens when more than one tab is open simultaneously
        console.warn('[Firestore] Persistence disabled: multiple tabs open.');
    }
    else if (err.code === 'unimplemented') {
        // Browser does not support IndexedDB (e.g. Firefox private mode)
        console.warn('[Firestore] Persistence not supported in this browser.');
    }
});
exports.default = app;
//# sourceMappingURL=firebase.js.map