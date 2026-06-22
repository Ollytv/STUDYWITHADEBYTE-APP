// public/firebase-messaging-sw.js
//
// ── SERVICE WORKER ───────────────────────────────────────────────────────────
//
// This file MUST live at /public/firebase-messaging-sw.js so it is served
// from the root of your domain (e.g. https://yourapp.com/firebase-messaging-sw.js).
// The browser registers it at the root scope, which is required for FCM.
//
// HOW IT WORKS:
//   When your app tab is CLOSED or BACKGROUNDED, Firebase Cloud Messaging
//   sends a push event directly to this service worker. The SW is kept alive
//   by the browser independently of the tab. It calls showNotification() to
//   surface the OS-level alert the user sees in their notification tray.
//
// ── IMPORTANT SETUP STEP ────────────────────────────────────────────────────
//   Replace the firebaseConfig values below with your actual project config.
//   They must match what is in src/services/firebase.ts exactly.
// ────────────────────────────────────────────────────────────────────────────

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

// ── Firebase config (must match src/services/firebase.ts) ───────────────────
firebase.initializeApp({
  apiKey:            "AIzaSyDbi7UoDBd0BQi8orZSPpLpa5bAcLAywuU",
  authDomain:        "studywithadebyte.firebaseapp.com",
  projectId:         "studywithadebyte",
  storageBucket:     "studywithadebyte.firebasestorage.app",
  messagingSenderId: "732799888407",
  appId:             "1:732799888407:web:1aa5f9aca4e94194654052",
});

const messaging = firebase.messaging();

// ── Background message handler ───────────────────────────────────────────────
// Called when a push arrives and the app tab is closed or hidden.
// FCM delivers the message here instead of to the app JS.
messaging.onBackgroundMessage((payload) => {
  const data        = payload.data || {};
  const leadMins    = parseInt(data.leadMins || '0', 10);
  const courseName  = data.courseName  || 'Class';
  const courseCode  = data.courseCode  || '';
  const venue       = data.venue       || '';
  const startTime   = data.startTime   || '';

  const title = leadMins === 0
    ? `🔔 ${courseName} is starting now!`
    : `⏰ ${courseName} in ${leadMins} minute${leadMins > 1 ? 's' : ''}`;

  const body = [courseCode, venue, startTime].filter(Boolean).join('  •  ');

  // showNotification renders the OS-level alert in the notification tray
  return self.registration.showNotification(title, {
    body,
    icon:   '/icons/icon-192x192.png',
    badge:  '/icons/icon-72x72.png',
    tag:    `${data.classId}-${leadMins}`,   // prevents duplicate notifications
    silent: false,
    data:   { url: self.location.origin },   // used by notificationclick below
    actions: [
      { action: 'open',    title: '📖 Open App' },
      { action: 'dismiss', title: 'Dismiss'     },
    ],
  });
});

// ── Notification click handler ───────────────────────────────────────────────
// When the user taps the notification in their tray, this opens the app.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open in a tab, focus it
      for (const client of clientList) {
        if (client.url.startsWith(targetUrl) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new tab
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
