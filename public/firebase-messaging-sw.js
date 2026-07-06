// public/firebase-messaging-sw.js
//
// Registered by the browser at /firebase-messaging-sw.js (must live at the
// site root to control the whole scope). Handles push delivery while the
// app is closed/backgrounded, and relays notification clicks back to any
// open tab so the SPA router can deep-link without a full reload.
//
// NOTE: this file cannot use ES module imports or environment variables —
// it runs in the browser's service worker scope, outside Vite's build.
// The Firebase config values below are public client identifiers (same ones
// already shipped in index.html/bundle), not secrets.

importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey:            self.__FIREBASE_CONFIG__?.apiKey            || '__VITE_FIREBASE_API_KEY__',
  authDomain:        self.__FIREBASE_CONFIG__?.authDomain        || '__VITE_FIREBASE_AUTH_DOMAIN__',
  projectId:         self.__FIREBASE_CONFIG__?.projectId         || '__VITE_FIREBASE_PROJECT_ID__',
  storageBucket:     self.__FIREBASE_CONFIG__?.storageBucket     || '__VITE_FIREBASE_STORAGE_BUCKET__',
  messagingSenderId: self.__FIREBASE_CONFIG__?.messagingSenderId || '__VITE_FIREBASE_MESSAGING_SENDER_ID__',
  appId:             self.__FIREBASE_CONFIG__?.appId             || '__VITE_FIREBASE_APP_ID__',
});

const messaging = firebase.messaging();

// ── Background message → OS notification ─────────────────────────────────────
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || payload.notification?.title || 'StudiByte';
  const body  = data.body  || payload.notification?.body  || '';

  const options = {
    body,
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    image: data.imageUrl || undefined,
    tag: data.notificationId || undefined,
    data: {
      deepLink: data.deepLink || '/',
      notificationId: data.notificationId || null,
    },
  };

  self.registration.showNotification(title, options);
});

// ── Click → focus/open a client and hand it the deep link ────────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const deepLink = event.notification.data?.deepLink || '/';
  const notificationId = event.notification.data?.notificationId || null;
  const targetUrl = new URL(deepLink, self.location.origin).href;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

      const existing = clientList.find(c => new URL(c.url).origin === self.location.origin);
      if (existing) {
        existing.postMessage({ type: 'NOTIFICATION_CLICK', deepLink, notificationId });
        return existing.focus();
      }

      return self.clients.openWindow(targetUrl);
    })()
  );
});
