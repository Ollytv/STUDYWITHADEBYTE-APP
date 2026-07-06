"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNotifications = useNotifications;
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
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useStore_1 = require("./useStore");
const notificationService_1 = require("../services/notificationService");
function useNotifications() {
    const { classes, settings, updateSettings } = (0, useStore_1.useStore)();
    const navigate = (0, react_router_dom_1.useNavigate)();
    const [alert, setAlert] = (0, react_1.useState)({ visible: false, payload: null });
    const [permissionState, setPermState] = (0, react_1.useState)(notificationService_1.getPermissionState);
    const settingsRef = (0, react_1.useRef)(settings);
    (0, react_1.useEffect)(() => { settingsRef.current = settings; }, [settings]);
    // ── 1. Schedule / reschedule whenever classes or settings change ───────────
    (0, react_1.useEffect)(() => {
        if (!settings?.notifications)
            return;
        (0, notificationService_1.scheduleNotifications)(classes, settings.notifications);
        return () => (0, notificationService_1.clearScheduledNotifications)();
    }, [classes, settings?.notifications]);
    // ── 2. Midnight reschedule — pick up next day's classes ───────────────────
    (0, react_1.useEffect)(() => {
        const now = new Date();
        const midnight = new Date();
        midnight.setHours(24, 0, 5, 0);
        const msToMidnight = midnight.getTime() - now.getTime();
        const midnightTimer = setTimeout(() => {
            if (settingsRef.current?.notifications) {
                (0, notificationService_1.scheduleNotifications)(classes, settingsRef.current.notifications);
            }
        }, msToMidnight);
        return () => clearTimeout(midnightTimer);
    }, [classes]);
    // ── 3. Listen for in-app class alert events ─────────────────────────────────
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            const payload = e.detail;
            setAlert({ visible: true, payload });
            if (settingsRef.current?.notifications?.sound)
                (0, notificationService_1.playAlertSound)();
        };
        window.addEventListener(notificationService_1.NOTIFICATION_EVENT, handler);
        return () => window.removeEventListener(notificationService_1.NOTIFICATION_EVENT, handler);
    }, []);
    // ── 4. Listen for admin-sent push alerts (foreground) ───────────────────────
    (0, react_1.useEffect)(() => {
        const handler = (e) => {
            const data = e.detail;
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
                },
            });
            if (settingsRef.current?.notifications?.sound)
                (0, notificationService_1.playAlertSound)();
        };
        window.addEventListener(notificationService_1.PUSH_NOTIFICATION_EVENT, handler);
        return () => window.removeEventListener(notificationService_1.PUSH_NOTIFICATION_EVENT, handler);
    }, []);
    // ── 5. Deep-link navigation from notification clicks ────────────────────────
    (0, react_1.useEffect)(() => {
        const clickHandler = (e) => {
            const { deepLink } = e.detail;
            if (deepLink)
                navigate(deepLink);
        };
        window.addEventListener(notificationService_1.NOTIFICATION_CLICK_EVENT, clickHandler);
        const cleanupSW = (0, notificationService_1.listenForNotificationClicks)();
        return () => {
            window.removeEventListener(notificationService_1.NOTIFICATION_CLICK_EVENT, clickHandler);
            cleanupSW();
        };
    }, [navigate]);
    // ── 6. Foreground FCM listener (handles server-sent pushes while app open) ─
    (0, react_1.useEffect)(() => {
        let cleanup = () => { };
        (0, notificationService_1.listenForForegroundMessages)().then(unsub => { cleanup = unsub; });
        return () => cleanup();
    }, []);
    // ── 7. Re-validate the FCM token whenever the tab regains focus ────────────
    (0, react_1.useEffect)(() => {
        const onVisible = () => {
            if (document.visibilityState === 'visible')
                (0, notificationService_1.refreshFCMTokenIfNeeded)();
        };
        document.addEventListener('visibilitychange', onVisible);
        (0, notificationService_1.refreshFCMTokenIfNeeded)();
        return () => document.removeEventListener('visibilitychange', onVisible);
    }, []);
    // ── 8. requestPermission — called from Settings toggle ─────────────────────
    const requestPermission = (0, react_1.useCallback)(async () => {
        const token = await (0, notificationService_1.requestAndSaveFCMToken)();
        const newState = (0, notificationService_1.getPermissionState)();
        setPermState(newState);
        if (token && newState === 'granted') {
            await updateSettings({
                notifications: { ...settings.notifications, enabled: true },
            });
            (0, notificationService_1.scheduleNotifications)(classes, { ...settings.notifications, enabled: true });
            return true;
        }
        return false;
    }, [classes, settings, updateSettings]);
    // ── 9. Dismiss the in-app popup ─────────────────────────────────────────────
    const dismissAlert = (0, react_1.useCallback)(() => {
        setAlert({ visible: false, payload: null });
    }, []);
    return {
        alert,
        dismissAlert,
        permissionState,
        requestPermission,
    };
}
//# sourceMappingURL=useNotifications.js.map