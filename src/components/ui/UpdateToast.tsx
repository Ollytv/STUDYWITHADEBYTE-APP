// src/components/ui/UpdateToast.tsx
//
// Surfaces "a new version is available" instead of leaving people silently
// stuck on a stale, service-worker-cached build — which is exactly what
// made the nav-gap fix invisible on an already-installed PWA.
//
// Deliberately NOT a full-screen modal like InstallPrompt: this is a small
// non-blocking corner toast so it can never trip Google's intrusive-
// interstitial checks and never covers page content for a real visitor.
//
// Requires `vite-plugin-pwa` (already a dependency via VitePWA in
// vite.config.js). If TypeScript complains about the `virtual:pwa-register/react`
// import, add this to a .d.ts file (e.g. src/vite-env.d.ts):
//   /// <reference types="vite-plugin-pwa/react" />

import { useRegisterSW } from 'virtual:pwa-register/react';

function RefreshIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

export default function UpdateToast() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      // Poll for an updated service worker periodically — covers users who
      // keep the installed PWA open/backgrounded for long stretches instead
      // of force-quitting, which is the exact scenario that left the last
      // fix invisible on an installed instance.
      if (!registration) return;
      const HOUR = 60 * 60 * 1000;
      setInterval(() => {
        registration.update().catch(() => {});
      }, HOUR);
    },
  });

  if (!needRefresh) return null;

  const handleUpdate = () => updateServiceWorker(true);
  const handleDismiss = () => setNeedRefresh(false);

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-3 right-3 sm:left-auto sm:right-4 sm:w-80 z-[58] glass rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        bottom: 'calc(var(--bottom-nav-height, 0px) + var(--safe-area-bottom, 0px) + 12px)',
      }}
    >
      <span className="flex-shrink-0 w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
        <RefreshIcon />
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-white leading-tight">Update available</p>
        <p className="text-[11px] text-neutral-400 leading-tight mt-0.5">Tap to refresh and get the latest version</p>
      </div>

      <button
        onClick={handleUpdate}
        className="flex-shrink-0 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-400 to-emerald-500 text-dark-950 text-xs font-semibold hover:opacity-90 active:scale-[0.97] transition-all no-select"
      >
        Refresh
      </button>

      <button
        onClick={handleDismiss}
        aria-label="Dismiss"
        className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-full text-neutral-500 hover:text-white hover:bg-white/10 transition-colors no-select"
      >
        <CloseIcon />
      </button>
    </div>
  );
}
