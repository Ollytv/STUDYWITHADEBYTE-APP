// src/hooks/useNotifications.ts
//
// Wires the notification service to the Zustand store.
// Responsibilities:
//   - Calls scheduleNotifications() whenever classes or settings change
//   - Listens for the NOTIFICATION_EVENT custom DOM event and drives the
//     in-app alert state (which NotificationAlert renders)
//   - Exposes requestPermission() so the Settings page can trigger it
//   - Starts the foreground FCM message listener once on mount
//   - Reschedules at midnight so tomorrow's classes are picked up
//
import { useEffect, useRef, useState, useCallback } from 'react';
import { useStore } from './useStore';
import {
  scheduleNotifications,
  clearScheduledNotifications,
  listenForForegroundMessages,
  requestAndSaveFCMToken,
  getPermissionState,
  playAlertSound,
  NOTIFICATION_EVENT,
  ClassAlertPayload,
} from '../services/notificationService';

export interface NotificationAlertState {
  visible:    boolean;
  payload:    ClassAlertPayload | null;
}

export function useNotifications() {
  const { classes, settings, updateSettings } = useStore();

  const [alert, setAlert]               = useState<NotificationAlertState>({ visible: false, payload: null });
  const [permissionState, setPermState] = useState<NotificationPermission>(getPermissionState);

  // Ref so event handler always sees latest settings without re-subscribing
  const settingsRef = useRef(settings);
  useEffect(() => { settingsRef.current = settings; }, [settings]);

  // ── 1. Schedule / reschedule whenever classes or settings change ───────────
  useEffect(() => {
    if (!settings?.notifications) return;
    scheduleNotifications(classes, settings.notifications);
    return () => clearScheduledNotifications();
  }, [classes, settings?.notifications]);

  // ── 2. Midnight reschedule — pick up next day's classes ───────────────────
  useEffect(() => {
    const now       = new Date();
    const midnight  = new Date();
    midnight.setHours(24, 0, 5, 0); // 5 seconds past midnight to be safe
    const msToMidnight = midnight.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      if (settingsRef.current?.notifications) {
        scheduleNotifications(classes, settingsRef.current.notifications);
      }
    }, msToMidnight);

    return () => clearTimeout(midnightTimer);
  }, [classes]);

  // ── 3. Listen for in-app alert events dispatched by the scheduler ──────────
  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<ClassAlertPayload>).detail;
      setAlert({ visible: true, payload });

      // Play sound if enabled (respects browser autoplay policy via the service)
      if (settingsRef.current?.notifications?.sound) {
        playAlertSound();
      }
    };

    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }, []);

  // ── 4. Foreground FCM listener (handles server-sent pushes while app open) ─
  useEffect(() => {
    let cleanup = () => {};
    listenForForegroundMessages().then(unsub => { cleanup = unsub; });
    return () => cleanup();
  }, []);

  // ── 5. requestPermission — called from Settings toggle ────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const token = await requestAndSaveFCMToken();
    const newState = getPermissionState();
    setPermState(newState);

    if (token && newState === 'granted') {
      // Enable notifications in settings and reschedule immediately
      await updateSettings({
        notifications: { ...settings.notifications, enabled: true },
      });
      scheduleNotifications(classes, { ...settings.notifications, enabled: true });
      return true;
    }
    return false;
  }, [classes, settings, updateSettings]);

  // ── 6. Dismiss the in-app popup ───────────────────────────────────────────
  const dismissAlert = useCallback(() => {
    setAlert({ visible: false, payload: null });
  }, []);

  return {
    alert,
    dismissAlert,
    permissionState,
    requestPermission,
  };
}
