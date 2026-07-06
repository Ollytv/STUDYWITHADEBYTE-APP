// src/hooks/useNotifications.ts
//
// Wires the notification service to the Zustand store.
// Responsibilities:
//   - Calls scheduleNotifications() whenever classes or settings change
//   - Listens for the NOTIFICATION_EVENT custom DOM event and drives the
//     in-app alert state (which NotificationAlert renders)
//   - Listens for PUSH_NOTIFICATION_EVENT (admin-sent FCM pushes) and drives
//     the same in-app alert UI
//   - Listens for NOTIFICATION_CLICK_EVENT (deep links from the service
//     worker) and navigates the SPA router
//   - Exposes requestPermission() so the Settings page can trigger it
//   - Starts the foreground FCM message listener once on mount
//   - Re-checks token validity on tab focus (rotation handling)
//   - Reschedules at midnight so tomorrow's classes are picked up
//
import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from './useStore';
import {
  scheduleNotifications,
  clearScheduledNotifications,
  listenForForegroundMessages,
  listenForNotificationClicks,
  requestAndSaveFCMToken,
  refreshFCMTokenIfNeeded,
  getPermissionState,
  playAlertSound,
  NOTIFICATION_EVENT,
  PUSH_NOTIFICATION_EVENT,
  NOTIFICATION_CLICK_EVENT,
  ClassAlertPayload,
  PushNotificationData,
} from '../services/notificationService';

export interface NotificationAlertState {
  visible: boolean;
  payload: (ClassAlertPayload & { title?: string; imageUrl?: string }) | null;
}

export function useNotifications() {
  const { classes, settings, updateSettings } = useStore();
  const navigate = useNavigate();

  const [alert, setAlert]               = useState<NotificationAlertState>({ visible: false, payload: null });
  const [permissionState, setPermState] = useState<NotificationPermission>(getPermissionState);

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
    midnight.setHours(24, 0, 5, 0);
    const msToMidnight = midnight.getTime() - now.getTime();

    const midnightTimer = setTimeout(() => {
      if (settingsRef.current?.notifications) {
        scheduleNotifications(classes, settingsRef.current.notifications);
      }
    }, msToMidnight);

    return () => clearTimeout(midnightTimer);
  }, [classes]);

  // ── 3. Listen for in-app class alert events ─────────────────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const payload = (e as CustomEvent<ClassAlertPayload>).detail;
      setAlert({ visible: true, payload });
      if (settingsRef.current?.notifications?.sound) playAlertSound();
    };

    window.addEventListener(NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATION_EVENT, handler);
  }, []);

  // ── 4. Listen for admin-sent push alerts (foreground) ───────────────────────
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent<PushNotificationData & { title: string; body?: string }>).detail;
      setAlert({
        visible: true,
        payload: {
          classId: data.notificationId ?? 'push',
          courseName: data.title,
          courseCode: '',
          venue: data.body ?? '',
          startTime: '',
          leadMins: 0,
          title: data.title,
          imageUrl: data.imageUrl,
        } as any,
      });
      if (settingsRef.current?.notifications?.sound) playAlertSound();
    };

    window.addEventListener(PUSH_NOTIFICATION_EVENT, handler);
    return () => window.removeEventListener(PUSH_NOTIFICATION_EVENT, handler);
  }, []);

  // ── 5. Deep-link navigation from notification clicks ────────────────────────
  useEffect(() => {
    const clickHandler = (e: Event) => {
      const { deepLink } = (e as CustomEvent<{ deepLink?: string }>).detail;
      if (deepLink) navigate(deepLink);
    };
    window.addEventListener(NOTIFICATION_CLICK_EVENT, clickHandler);
    const cleanupSW = listenForNotificationClicks();
    return () => {
      window.removeEventListener(NOTIFICATION_CLICK_EVENT, clickHandler);
      cleanupSW();
    };
  }, [navigate]);

  // ── 6. Foreground FCM listener (handles server-sent pushes while app open) ─
  useEffect(() => {
    let cleanup = () => {};
    listenForForegroundMessages().then(unsub => { cleanup = unsub; });
    return () => cleanup();
  }, []);

  // ── 7. Re-validate the FCM token whenever the tab regains focus ────────────
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshFCMTokenIfNeeded();
    };
    document.addEventListener('visibilitychange', onVisible);
    refreshFCMTokenIfNeeded();
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  // ── 8. requestPermission — called from Settings toggle ─────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const token = await requestAndSaveFCMToken();
    const newState = getPermissionState();
    setPermState(newState);

    if (token && newState === 'granted') {
      await updateSettings({
        notifications: { ...settings.notifications, enabled: true },
      });
      scheduleNotifications(classes, { ...settings.notifications, enabled: true });
      return true;
    }
    return false;
  }, [classes, settings, updateSettings]);

  // ── 9. Dismiss the in-app popup ─────────────────────────────────────────────
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