"use strict";
// src/hooks/usePwaInstall.ts
//
// Encapsulates all PWA-install logic for StudiByte:
//  - detects the platform (iOS / Android / Desktop)
//  - detects whether the app is already installed (standalone mode)
//  - captures the browser's native `beforeinstallprompt` event (Android/Desktop Chrome)
//  - decides whether the first-visit install popup should be shown
//  - persists the user's choice in localStorage so the popup behaves correctly
//    on future visits
//
// This hook has no UI — it's consumed by <InstallPrompt />.
Object.defineProperty(exports, "__esModule", { value: true });
exports.usePwaInstall = usePwaInstall;
const react_1 = require("react");
const STORAGE_KEY = 'studibyte_install_prompt_status';
// If the user picks "Maybe Later" (without checking "Don't show again"),
// we wait this long before considering showing the popup again.
const RESHOW_AFTER_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
// Small delay so the popup doesn't slam the user the instant the app loads.
const SHOW_DELAY_MS = 1800;
function readStatus() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
function writeStatus(choice) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ choice, timestamp: Date.now() }));
    }
    catch {
        // localStorage unavailable (private mode / quota) — fail silently,
        // worst case the popup may reappear, which is harmless.
    }
}
function detectPlatform() {
    const ua = window.navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) ||
        // iPadOS 13+ reports as "MacIntel" but is touch-capable
        (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (isIOS)
        return 'ios';
    if (/android/i.test(ua))
        return 'android';
    return 'desktop';
}
function checkIsInstalled() {
    if (typeof window === 'undefined')
        return false;
    if (window.matchMedia?.('(display-mode: standalone)').matches)
        return true;
    // iOS Safari exposes this non-standard flag once added to the home screen
    if (window.navigator.standalone === true)
        return true;
    // Android TWA / Trusted Web Activity referrer
    if (document.referrer.startsWith('android-app://'))
        return true;
    return false;
}
function usePwaInstall() {
    const [platform] = (0, react_1.useState)(detectPlatform);
    const [isInstalled, setIsInstalled] = (0, react_1.useState)(checkIsInstalled);
    const [deferredPrompt, setDeferredPrompt] = (0, react_1.useState)(null);
    const [shouldShow, setShouldShow] = (0, react_1.useState)(false);
    // Decide on mount whether the popup is allowed to appear at all.
    (0, react_1.useEffect)(() => {
        if (isInstalled) {
            writeStatus('installed');
            return;
        }
        const stored = readStatus();
        const allowedByHistory = !stored || (stored.choice === 'later' && Date.now() - stored.timestamp > RESHOW_AFTER_MS);
        if (!allowedByHistory)
            return;
        const timer = setTimeout(() => setShouldShow(true), SHOW_DELAY_MS);
        return () => clearTimeout(timer);
    }, [isInstalled]);
    // Listen for the browser's native install prompt + successful installation.
    (0, react_1.useEffect)(() => {
        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        const handleAppInstalled = () => {
            writeStatus('installed');
            setIsInstalled(true);
            setShouldShow(false);
            setDeferredPrompt(null);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstall);
        window.addEventListener('appinstalled', handleAppInstalled);
        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);
    /** Triggers the native browser install prompt, if the browser has made one available. */
    const promptInstall = (0, react_1.useCallback)(async () => {
        if (!deferredPrompt)
            return 'unavailable';
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        setDeferredPrompt(null);
        if (outcome === 'accepted') {
            writeStatus('installed');
            setIsInstalled(true);
            setShouldShow(false);
        }
        return outcome;
    }, [deferredPrompt]);
    /** Closes the popup and records the user's choice. */
    const dismiss = (0, react_1.useCallback)((permanent) => {
        writeStatus(permanent ? 'never' : 'later');
        setShouldShow(false);
    }, []);
    return {
        platform,
        isInstalled,
        shouldShow,
        canUseNativePrompt: !!deferredPrompt,
        promptInstall,
        dismiss,
    };
}
//# sourceMappingURL=usePwaInstall.js.map