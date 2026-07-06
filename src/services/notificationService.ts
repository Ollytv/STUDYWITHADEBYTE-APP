// src/services/notificationService.ts
//
// ── ARCHITECTURE ────────────────────────────────────────────────────────────
//
//  1. FCM REGISTRATION — requests permission, retrieves an FCM device token,
//     and upserts it under users/{uid}/devices/{tokenHash} so a user can have
//     multiple concurrent devices. Token hash = SHA-256(token), so re-registering
//     the same token is a no-op write (dedup) and rotated tokens replace the
//     stale device doc instead of accumulating duplicates.
//
//  2. SCHEDULER — reads today's classes, computes milliseconds until each
//     one starts (± lead-time offsets), and sets precise setTimeout handles.
//     When a handle fires, it dispatches a CustomEvent that the React hook
//     listens to, AND calls the Web Notification API directly for foreground
//     visibility. Fired class IDs are tracked in a Set to prevent duplicates.
//
//  3. SOUND — synthesises a short alert tone via the Web Audio API.
//
//  4. CLICK / DEEP LINK — background clicks are handled by
//     firebase-messaging-sw.js, which postMessages the deep link back to any
//     open client. This module relays that into the same CustomEvent bus the
//     rest of the app already listens on.
//
// ── BACKGROUND DELIVERY ─────────────────────────────────────────────────────
//
//  When the app tab is closed, the service worker (firebase-messaging-sw.js)
//  receives FCM push events and calls self.registration.showNotification().
//  That path is entirely separate from this file — the SW is registered once
//  by the browser and runs independently.
//
// ────────────────────────────────────────────────────────────────────────────

import { getToken, onMessage } from 'firebase/messaging';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { messagingPromise, db, auth } from './firebase';
import { CourseClass } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

// VITE_FIREBASE_VAPID_KEY — Firebase Console → Project Settings → Cloud
// Messaging → Web Push certificates.
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

if (!VAPID_KEY) {
  console.error('[Notifications] VITE_FIREBASE_VAPID_KEY is not set. Push notifications will not work.');
}

// Key used to detect token rotation between sessions without re-registering
// on every load.
const LAST_TOKEN_STORAGE_KEY = 'studibyte:lastFcmToken';

// How many minutes before class to fire each alert tier
const LEAD_TIMES: Record<string, number> = {
  tenMinsBefore:    10,
  thirtyMinsBefore: 30,
  oneHourBefore:    60,
};

// Days of the week matching your CourseClass.day field values
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── State ────────────────────────────────────────────────────────────────────

const activeTimers: ReturnType<typeof setTimeout>[] = [];
const firedToday = new Set<string>();
let lastResetDate = '';

// ── Public event names ───────────────────────────────────────────────────────
export const NOTIFICATION_EVENT = 'studibyte:classAlert';        // class-schedule alerts (ClassAlertPayload)
export const PUSH_NOTIFICATION_EVENT = 'studibyte:pushAlert';    // admin-sent FCM pushes (PushNotificationData)
export const NOTIFICATION_CLICK_EVENT = 'studibyte:notificationClick';

// ── Types ────────────────────────────────────────────────────────────────────
export interface ClassAlertPayload {
  classId:    string;
  courseName: string;
  courseCode: string;
  venue:      string;
  startTime:  string;
  leadMins:   number; // 0 = class is starting now, 10/30/60 = advance warning
}

export interface NotificationSettings {
  enabled:          boolean;
  tenMinsBefore:    boolean;
  thirtyMinsBefore: boolean;
  oneHourBefore:    boolean;
  sound:            boolean;
}

// Shape of the `data` payload on every FCM message this app sends/receives.
// Push payloads only carry strings — coerce on the way in.
export interface PushNotificationData {
  notificationId?: string;
  title?:          string;
  body?:           string;
  imageUrl?:       string;
  deepLink?:       string;
  type?:           string;
}

// ── Sound synthesis ──────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  } catch {
    return null;
  }
}

export function playAlertSound(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return;
  }

  const now = ctx.currentTime;
  const tones = [
    { freq: 520, start: now,        duration: 0.18 },
    { freq: 780, start: now + 0.22, duration: 0.28 },
  ];

  tones.forEach(({ freq, start, duration }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  });
}

// ── Token hashing (dedup key) ────────────────────────────────────────────────

async function hashToken(token: string): Promise<string> {
  const bytes = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function detectPlatform(): string {
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return 'android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'web';
}

// ── FCM permission + token registration ──────────────────────────────────────

/**
 * Requests notification permission, retrieves the FCM device token, and
 * upserts it to users/{uid}/devices/{tokenHash}. Supports multiple devices
 * per user (each device gets its own doc, keyed by a hash of its token) and
 * is idempotent: registering the same token twice does not create duplicates,
 * and a rotated token removes the previous device doc for this browser.
 *
 * Returns the token string on success, or null if permission was denied or
 * FCM is not supported in this browser.
 */
export async function requestAndSaveFCMToken(): Promise<string | null> {
  try {
    const messaging = await messagingPromise;
    if (!messaging) {
      console.warn('[Notifications] FCM not supported in this browser');
      return null;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.info('[Notifications] Permission denied by user');
      return null;
    }

    const registration = await navigator.serviceWorker.ready.catch(() => undefined);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return null;

    await persistToken(token);
    return token;
  } catch (err) {
    console.error('[Notifications] FCM token error:', err);
    return null;
  }
}

/**
 * Writes/updates the device doc for the given token and cleans up the
 * previous token's doc if it rotated since the last session.
 */
async function persistToken(token: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const tokenHash = await hashToken(token);
  const deviceRef = doc(db, 'users', user.uid, 'devices', tokenHash);

  const previousToken = localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
  if (previousToken && previousToken !== token) {
    const prevHash = await hashToken(previousToken);
    if (prevHash !== tokenHash) {
      await deleteDoc(doc(db, 'users', user.uid, 'devices', prevHash)).catch(() => {});
    }
  }

  const existing = await getDoc(deviceRef).catch(() => null);

  await setDoc(
    deviceRef,
    {
      token,
      platform:   detectPlatform(),
      userAgent:  navigator.platform,
      updatedAt:  serverTimestamp(),
      ...(existing?.exists() ? {} : { createdAt: serverTimestamp() }),
    },
    { merge: true }
  );

  localStorage.setItem(LAST_TOKEN_STORAGE_KEY, token);
}

/**
 * Re-checks the current FCM token against the last known one and persists it
 * if it changed. Cheap to call often (e.g. on tab focus) — getToken() returns
 * the cached token instantly unless a real rotation occurred.
 */
export async function refreshFCMTokenIfNeeded(): Promise<void> {
  try {
    if (getPermissionState() !== 'granted') return;
    const messaging = await messagingPromise;
    if (!messaging) return;

    const registration = await navigator.serviceWorker.ready.catch(() => undefined);
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (!token) return;

    const previousToken = localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
    if (token !== previousToken) {
      await persistToken(token);
    }
  } catch (err) {
    console.warn('[Notifications] Token refresh check failed:', err);
  }
}

/**
 * Removes this browser's device doc — call on sign-out so a stale token
 * doesn't keep receiving pushes for an account the user has left.
 */
export async function unregisterCurrentDevice(): Promise<void> {
  const user = auth.currentUser;
  const token = localStorage.getItem(LAST_TOKEN_STORAGE_KEY);
  if (!user || !token) return;

  try {
    const tokenHash = await hashToken(token);
    await deleteDoc(doc(db, 'users', user.uid, 'devices', tokenHash));
  } catch (err) {
    console.warn('[Notifications] Failed to unregister device:', err);
  } finally {
    localStorage.removeItem(LAST_TOKEN_STORAGE_KEY);
  }
}

/**
 * Returns the current browser notification permission state without
 * triggering a permission prompt. Safe to call at any time.
 */
export function getPermissionState(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// ── Foreground FCM message handler ──────────────────────────────────────────

/**
 * When the app is in the foreground, FCM suppresses the OS notification and
 * delivers it here instead. Re-dispatched as a DOM CustomEvent so any part
 * of the app (in-app banner, notification center badge) can react.
 */
export async function listenForForegroundMessages(): Promise<() => void> {
  const messaging = await messagingPromise;
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const data = payload.data as PushNotificationData | undefined;
    const title = data?.title ?? payload.notification?.title;
    const body  = data?.body  ?? payload.notification?.body;
    if (!title) return;

    window.dispatchEvent(
      new CustomEvent<PushNotificationData & { title: string; body?: string }>(PUSH_NOTIFICATION_EVENT, {
        detail: { ...data, title, body },
      })
    );

    // Foreground pushes don't auto-show an OS notification, so surface one
    // manually when the tab isn't focused/visible.
    if (document.visibilityState !== 'visible' && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: data?.notificationId,
        data: { deepLink: data?.deepLink },
      });
    }
  });

  return unsubscribe;
}

/**
 * Listens for deep-link clicks relayed from the service worker
 * (firebase-messaging-sw.js postMessages the client on notificationclick)
 * and re-dispatches them as a same DOM CustomEvent bus for the router to
 * consume. Call once near app root.
 */
export function listenForNotificationClicks(): () => void {
  const handler = (event: MessageEvent) => {
    if (event.data?.type !== 'NOTIFICATION_CLICK') return;
    window.dispatchEvent(
      new CustomEvent<{ deepLink?: string; notificationId?: string }>(NOTIFICATION_CLICK_EVENT, {
        detail: { deepLink: event.data.deepLink, notificationId: event.data.notificationId },
      })
    );
  };

  navigator.serviceWorker?.addEventListener('message', handler);
  return () => navigator.serviceWorker?.removeEventListener('message', handler);
}

// ── Class scheduler ──────────────────────────────────────────────────────────

export function clearScheduledNotifications(): void {
  activeTimers.forEach(clearTimeout);
  activeTimers.length = 0;
}

export function scheduleNotifications(
  classes: CourseClass[],
  settings: NotificationSettings
): void {
  if (!settings.enabled) {
    clearScheduledNotifications();
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if (lastResetDate !== today) {
    firedToday.clear();
    lastResetDate = today;
  }

  const todayName = DAY_NAMES[new Date().getDay()];
  const todayClasses = classes.filter(c => c.day === todayName);

  if (todayClasses.length === 0) return;

  clearScheduledNotifications();

  const leadMinutes: number[] = [0];
  Object.entries(LEAD_TIMES).forEach(([key, mins]) => {
    if (settings[key as keyof NotificationSettings]) leadMinutes.push(mins);
  });

  todayClasses.forEach(cls => {
    const [hStr, mStr] = cls.startTime.split(':');
    const classHour   = parseInt(hStr, 10);
    const classMinute = parseInt(mStr, 10);

    leadMinutes.forEach(leadMins => {
      const dedupKey = `${cls.id}-${leadMins}`;
      if (firedToday.has(dedupKey)) return;

      const now          = new Date();
      const fireAt       = new Date();
      fireAt.setHours(classHour, classMinute - leadMins, 0, 0);
      const msUntilFire  = fireAt.getTime() - now.getTime();

      if (msUntilFire < 0) return;

      const handle = setTimeout(() => {
        firedToday.add(dedupKey);

        const payload: ClassAlertPayload = {
          classId:    cls.id,
          courseName: cls.courseName,
          courseCode: cls.courseCode,
          venue:      cls.venue,
          startTime:  cls.startTime,
          leadMins,
        };

        window.dispatchEvent(
          new CustomEvent<ClassAlertPayload>(NOTIFICATION_EVENT, { detail: payload })
        );

        if (Notification.permission === 'granted') {
          const title = leadMins === 0
            ? `🔔 ${cls.courseName} is starting now!`
            : `⏰ ${cls.courseName} in ${leadMins} minute${leadMins > 1 ? 's' : ''}`;

          new Notification(title, {
            body: `${cls.courseCode}  •  ${cls.venue}  •  ${cls.startTime}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: dedupKey,
            silent: false,
          });
        }

        if (settings.sound) playAlertSound();

      }, msUntilFire);

      activeTimers.push(handle);
    });
  });

  console.info(
    `[Notifications] Scheduled ${activeTimers.length} alert(s) for ${todayClasses.length} class(es) today`
  );
}
