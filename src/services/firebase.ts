// src/services/firebase.ts
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';
import { getMessaging, isSupported } from 'firebase/messaging';

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
] as const;

const missing = REQUIRED_ENV_VARS.filter(
  key => !import.meta.env[key] || import.meta.env[key] === ''
);
if (missing.length > 0) {
  throw new Error(
    `[Firebase] Missing required environment variables: ${missing.join(', ')}. ` +
    'Check your .env file and Netlify environment variable settings.'
  );
}

// ── Firebase config — all values from environment variables ──────────────────
// Keys are intentionally NOT hardcoded. See .env / Netlify dashboard.
const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY            as string,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN        as string,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID         as string,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET     as string,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID              as string,
};

const app = initializeApp(firebaseConfig);

export const auth    = getAuth(app);
export const db      = getFirestore(app);
export const storage = getStorage(app);

// Analytics only runs in a real browser context (not SSR, not Node test runners)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// ── FCM messaging ─────────────────────────────────────────────────────────────
// FCM is only supported in secure contexts (HTTPS / localhost) with a real
// browser. isSupported() is async and returns false in SSR, Node, Firefox
// private browsing, and some older WebViews. Exporting a promise lets callers
// gracefully skip notification features when unsupported.
export const messagingPromise = (async () => {
  try {
    const supported = await isSupported();
    if (!supported) return null;
    return getMessaging(app);
  } catch {
    // Never throw — notification support is a progressive enhancement
    return null;
  }
})();

// ── Offline persistence ───────────────────────────────────────────────────────
// Enables Firestore to serve cached data when the device is offline.
// Errors here are non-fatal — the app works fine without persistence.
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Happens when more than one tab is open simultaneously
    console.warn('[Firestore] Persistence disabled: multiple tabs open.');
  } else if (err.code === 'unimplemented') {
    // Browser does not support IndexedDB (e.g. Firefox private mode)
    console.warn('[Firestore] Persistence not supported in this browser.');
  }
});

export default app;