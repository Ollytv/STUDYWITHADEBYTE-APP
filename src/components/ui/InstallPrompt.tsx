// src/components/ui/InstallPrompt.tsx
//
// First-visit "Install StudiByte" popup.
// - Shown automatically once per the rules in usePwaInstall (first visit only,
//   unless the user picks "Maybe Later" without "Don't show again", in which
//   case it may resurface after a few days).
// - Detects iOS / Android / Desktop and renders the matching install steps.
// - Triggers the native PWA install prompt on Android/Desktop when the
//   browser has made one available; otherwise highlights the manual steps.
// - Never renders if the app is already installed.

import { useEffect, useState } from 'react';
import { usePwaInstall, type Platform } from '../../hooks/usePwaInstall';

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v13" />
      <path d="M7 7l5-5 5 5" />
      <path d="M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
    </svg>
  );
}

function MenuDotsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="12" cy="5" r="1.8" />
      <circle cx="12" cy="12" r="1.8" />
      <circle cx="12" cy="19" r="1.8" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// Prevents the full-screen install sheet from ever rendering for automated
// clients — search engine crawlers, social-link-preview bots, and the
// headless Puppeteer instance our own prerender.mjs script uses. Google
// treats a full-screen modal shown on mount as an intrusive interstitial and
// will flag/penalize pages for it, and it also blocks the crawler from
// seeing the actual page content underneath.
function isAutomatedClient(): boolean {
  if (typeof navigator === 'undefined') return false;

  // navigator.webdriver is set to true by Puppeteer, Playwright, Selenium,
  // and most headless browsers (including our own prerender.mjs run) —
  // this alone covers the exact case you're seeing in Search Console.
  if (navigator.webdriver) return true;

  const ua = navigator.userAgent || '';
  return /bot|googlebot|bingbot|yandexbot|baiduspider|duckduckbot|slurp|crawler|spider|robot|crawling|facebookexternalhit|twitterbot|linkedinbot|slackbot|discordbot|telegrambot|whatsapp|embedly|quora link preview|pinterest|prerender|headlesschrome|lighthouse/i.test(
    ua
  );
}

const BENEFITS = ['Faster access', 'Works like a real app', 'Quick study access', 'Better mobile experience'];

const STEPS: Record<Platform, { icon: JSX.Element; text: string }[]> = {
  android: [
    { icon: <MenuDotsIcon />, text: 'Tap the browser menu (⋮)' },
    { icon: <DownloadIcon />, text: 'Select "Install app" or "Add to Home screen"' },
    { icon: <CheckIcon />, text: 'Confirm installation' },
  ],
  ios: [
    { icon: <ShareIcon />, text: 'Tap the Share button' },
    { icon: <DownloadIcon />, text: 'Select "Add to Home Screen"' },
    { icon: <CheckIcon />, text: 'Tap "Add" in the top-right corner' },
  ],
  desktop: [
    { icon: <DownloadIcon />, text: 'Click the install icon (⊕) in the address bar' },
    { icon: <MenuDotsIcon />, text: 'Or open the browser menu and select "Install StudiByte"' },
    { icon: <CheckIcon />, text: 'Click "Install" to confirm' },
  ],
};

const PLATFORM_LABEL: Record<Platform, string> = {
  ios: 'iPhone / iPad',
  android: 'Android',
  desktop: 'Desktop',
};

export default function InstallPrompt() {
  const { platform, shouldShow, canUseNativePrompt, promptInstall, dismiss } = usePwaInstall();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [entered, setEntered] = useState(false);
  const [highlightSteps, setHighlightSteps] = useState(false);

  // Animate in once the popup is allowed to render.
  useEffect(() => {
    if (!shouldShow) {
      setEntered(false);
      return;
    }
    const frame = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(frame);
  }, [shouldShow]);

  if (!shouldShow || isAutomatedClient()) return null;

  const handleInstallNow = async () => {
    if (canUseNativePrompt) {
      const outcome = await promptInstall();
      // If the user declined the native prompt, treat it like "Maybe Later"
      // so we don't keep firing the prompt repeatedly.
      if (outcome === 'dismissed') dismiss(false);
      return;
    }
    // No native prompt available (always the case on iOS, and sometimes
    // briefly on Android/Desktop before Chrome fires the event) — there's
    // nothing to trigger programmatically, so draw attention to the manual
    // steps instead of doing nothing.
    setHighlightSteps(true);
    setTimeout(() => setHighlightSteps(false), 1400);
  };

  const handleMaybeLater = () => dismiss(dontShowAgain);
  const steps = STEPS[platform];

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-end sm:items-center justify-center transition-opacity duration-300 ${
        entered ? 'opacity-100' : 'opacity-0'
      }`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="install-prompt-heading"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={handleMaybeLater} />

      {/* Sheet on mobile, centered card on larger screens */}
      <div
        className={`relative w-full sm:max-w-sm sm:mx-4 bg-dark-950 border border-white/10 rounded-t-3xl sm:rounded-3xl shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          entered ? 'translate-y-0' : 'translate-y-full sm:translate-y-8'
        }`}
      >
        <button
          onClick={handleMaybeLater}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition-colors no-select"
        >
          <CloseIcon />
        </button>

        <div className="px-6 pt-7 pb-6 pb-safe max-h-[85vh] overflow-y-auto">
          {/* Heading */}
          <div className="flex items-center gap-3 mb-4">
            <img src="/icons/icon-96x96.png" alt="" className="w-12 h-12 rounded-xl border border-white/10" />
            <div>
              <h2
                id="install-prompt-heading"
                className="text-lg font-bold text-white leading-tight"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Install StudiByte
              </h2>
              <p className="text-xs text-neutral-500">{PLATFORM_LABEL[platform]} detected</p>
            </div>
          </div>

          <p className="text-sm text-neutral-300 leading-relaxed mb-5">
            Add StudiByte to your home screen for instant access to your timetable,
            attendance, and study tools — no browser tabs, no waiting.
          </p>

          {/* Benefits */}
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {BENEFITS.map((benefit) => (
              <div key={benefit} className="flex items-center gap-2 glass rounded-xl px-2.5 py-2">
                <span className="flex-shrink-0 w-4 h-4 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center">
                  <CheckIcon />
                </span>
                <span className="text-xs text-neutral-200">{benefit}</span>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div
            className={`rounded-2xl border p-4 mb-6 transition-colors duration-300 ${
              highlightSteps ? 'border-green-500/60 bg-green-500/5' : 'border-white/10 bg-white/[0.03]'
            }`}
          >
            <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-3">How to install</p>
            <ol className="space-y-3">
              {steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 text-neutral-200 text-[11px] font-semibold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-neutral-200 pt-0.5 flex-1">{step.text}</span>
                  <span className="flex-shrink-0 text-neutral-500 mt-1">{step.icon}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Don't show again */}
          <label className="flex items-center gap-2.5 mb-5 cursor-pointer no-select">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded accent-green-500 bg-white/10 border-white/20"
            />
            <span className="text-xs text-neutral-400">Don&apos;t show this again</span>
          </label>

          {/* Actions */}
          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleInstallNow}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-dark-950 font-semibold text-sm hover:opacity-90 active:scale-[0.98] transition-all"
            >
              Install Now
            </button>
            <button
              onClick={handleMaybeLater}
              className="w-full py-3 rounded-xl text-neutral-400 text-sm font-medium hover:text-white hover:bg-white/5 transition-colors"
            >
              Maybe Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}