// src/services/notificationService.ts
//
// ── ARCHITECTURE ────────────────────────────────────────────────────────────
//
//  This service owns ALL notification logic. It has three jobs:
//
//  1. FCM REGISTRATION — requests permission, retrieves an FCM device token,
//     and saves it to Firestore so the service worker can use it for
//     background push delivery.
//
//  2. SCHEDULER — reads today's classes, computes milliseconds until each
//     one starts (± lead-time offsets), and sets precise setTimeout handles.
//     When a handle fires, it dispatches a CustomEvent that the React hook
//     listens to, AND calls the Web Notification API directly for foreground
//     visibility. Fired class IDs are tracked in a Set to prevent duplicates.
//
//  3. SOUND — synthesises a short alert tone via the Web Audio API.
//     No audio file needed; works offline; respects browser autoplay policy
//     (sound only plays after a user gesture has occurred in the session).
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
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { messagingPromise, db, auth } from './firebase';
import { CourseClass } from '../types';

// ── Constants ────────────────────────────────────────────────────────────────

// Your VAPID public key — get this from:
// Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
// Click "Generate key pair" if you haven't already, then paste the Key Pair value here.
// In .env:
// VITE_FIREBASE_VAPID_KEY=your_actual_vapid_key_here

// In notificationService.ts:
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

if (!VAPID_KEY) {
  console.error('[Notifications] VITE_FIREBASE_VAPID_KEY is not set. Push notifications will not work.');
}

// How many minutes before class to fire each alert tier
const LEAD_TIMES: Record<string, number> = {
  tenMinsBefore:    10,
  thirtyMinsBefore: 30,
  oneHourBefore:    60,
};

// Days of the week matching your CourseClass.day field values
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── State ────────────────────────────────────────────────────────────────────

// Active setTimeout handles — cleared when rescheduling or on cleanup
const activeTimers: ReturnType<typeof setTimeout>[] = [];

// Deduplication set — tracks "classId-leadMinutes" keys already fired today
// so a re-render or hot-reload can't double-fire the same alert
const firedToday = new Set<string>();

// Track which calendar date firedToday was last reset for
let lastResetDate = '';

// ── Public event name ────────────────────────────────────────────────────────
// The React hook listens for this on window to show the in-app popup
export const NOTIFICATION_EVENT = 'studibyte:classAlert';

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

// ── Sound synthesis ──────────────────────────────────────────────────────────
// Uses the Web Audio API to generate a two-tone chime — no audio file required.
// The browser's autoplay policy means this only works after a user gesture has
// happened in the tab. If the app is in the background when the timer fires,
// sound is silently skipped (the OS notification handles user attention instead).
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

  // Resume suspended context (required after user gesture on some browsers)
  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
    return; // sound will play on next interaction; skip silently
  }

  const now = ctx.currentTime;

  // Two-tone rising chime: 520 Hz → 780 Hz
  const tones = [
    { freq: 520, start: now,        duration: 0.18 },
    { freq: 780, start: now + 0.22, duration: 0.28 },
  ];

  tones.forEach(({ freq, start, duration }) => {
    const osc  = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type      = 'sine';
    osc.frequency.setValueAtTime(freq, start);

    // Soft attack + decay envelope so it doesn't sound harsh
    gain.gain.setValueAtTime(0,    start);
    gain.gain.linearRampToValueAtTime(0.35, start + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(start);
    osc.stop(start + duration);
  });
}

// ── FCM permission + token ───────────────────────────────────────────────────

/**
 * Requests notification permission from the browser, retrieves the FCM device
 * token, and persists it to Firestore under the user's profile so the service
 * worker (and future server-side senders) can address this device.
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

    const token = await getToken(messaging, { vapidKey: VAPID_KEY });
    if (!token) return null;

    // Persist token to Firestore — stored under users/{uid}/meta/fcmToken
    // so it's available if you ever want to send targeted server-side pushes
    const user = auth.currentUser;
    if (user) {
      await setDoc(
        doc(db, 'users', user.uid, 'meta', 'fcmToken'),
        { token, updatedAt: serverTimestamp(), platform: navigator.platform },
        { merge: true }
      );
    }

    return token;
  } catch (err) {
    console.error('[Notifications] FCM token error:', err);
    return null;
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
 * delivers it here instead. We re-dispatch it as our custom DOM event so the
 * React hook can show the in-app alert UI.
 *
 * Call this once after FCM is initialised (done inside useNotifications hook).
 */
export async function listenForForegroundMessages(): Promise<() => void> {
  const messaging = await messagingPromise;
  if (!messaging) return () => {};

  const unsubscribe = onMessage(messaging, (payload) => {
    const data = payload.data as Partial<ClassAlertPayload> | undefined;
    if (!data?.classId) return;

    window.dispatchEvent(
      new CustomEvent<ClassAlertPayload>(NOTIFICATION_EVENT, { detail: data as ClassAlertPayload })
    );
  });

  return unsubscribe;
}

// ── Scheduler ────────────────────────────────────────────────────────────────

/**
 * Clears all currently scheduled notification timers.
 * Called before rescheduling (e.g. when classes change) and on cleanup.
 */
export function clearScheduledNotifications(): void {
  activeTimers.forEach(clearTimeout);
  activeTimers.length = 0;
}

/**
 * Schedules notification timers for all of today's classes based on the
 * user's notification settings. Safe to call multiple times — it clears
 * existing timers first and uses a deduplication set to prevent double-firing.
 *
 * @param classes  — full list of CourseClass objects from the store
 * @param settings — user's notification preferences
 */
export function scheduleNotifications(
  classes: CourseClass[],
  settings: NotificationSettings
): void {
  if (!settings.enabled) {
    clearScheduledNotifications();
    return;
  }

  // Reset dedup set once per calendar day
  const today = new Date().toISOString().split('T')[0];
  if (lastResetDate !== today) {
    firedToday.clear();
    lastResetDate = today;
  }

  // Filter to today's classes only
  const todayName = DAY_NAMES[new Date().getDay()];
  const todayClasses = classes.filter(c => c.day === todayName);

  if (todayClasses.length === 0) return;

  clearScheduledNotifications();

  // Build lead-time offsets the user has enabled, plus 0 (class starting now)
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
      if (firedToday.has(dedupKey)) return; // already fired this session

      // Calculate ms until (classTime - leadMins) from right now
      const now          = new Date();
      const fireAt       = new Date();
      fireAt.setHours(classHour, classMinute - leadMins, 0, 0);
      const msUntilFire  = fireAt.getTime() - now.getTime();

      if (msUntilFire < 0) return; // already passed today

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

        // 1️⃣ Dispatch in-app event (React hook picks this up for the popup UI)
        window.dispatchEvent(
          new CustomEvent<ClassAlertPayload>(NOTIFICATION_EVENT, { detail: payload })
        );

        // 2️⃣ Web Notification API — shows OS-level notification if app is visible
        //    but the tab is not focused (e.g. user is on another tab)
        if (Notification.permission === 'granted') {
          const title = leadMins === 0
            ? `🔔 ${cls.courseName} is starting now!`
            : `⏰ ${cls.courseName} in ${leadMins} minute${leadMins > 1 ? 's' : ''}`;

          new Notification(title, {
            body: `${cls.courseCode}  •  ${cls.venue}  •  ${cls.startTime}`,
            icon: '/icons/icon-192x192.png',
            badge: '/icons/icon-72x72.png',
            tag: dedupKey, // browser deduplicates same-tag notifications
            silent: false,
          });
        }

        // 3️⃣ Sound (only if user enabled it and audio context is ready)
        if (settings.sound) playAlertSound();

      }, msUntilFire);

      activeTimers.push(handle);
    });
  });

  console.info(
    `[Notifications] Scheduled ${activeTimers.length} alert(s) for ${todayClasses.length} class(es) today`
  );
}
