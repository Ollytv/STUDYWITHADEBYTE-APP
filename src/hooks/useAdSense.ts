import { useEffect } from 'react';

const ADSENSE_CLIENT = 'ca-pub-2809603575540112';
const SCRIPT_ID = 'adsense-script';
const HIDE_STYLE_ID = 'adsense-hide-style';

/**
 * Public pages with real, substantial content. Deliberately NOT included:
 * login/welcome/onboarding, the signed-in app, and short functional pages
 * (contact, support, privacy, terms). AdSense policy does not allow ads on
 * screens without publisher content or that exist mainly for navigation.
 */
const AD_ELIGIBLE_PATHS = [
  /^\/features\/?$/,
  /^\/faq\/?$/,
  /^\/about\/?$/,
  /^\/guides\/?$/,
  /^\/guides\/[^/]+\/?$/,
];

export function isAdEligiblePath(pathname: string): boolean {
  return AD_ELIGIBLE_PATHS.some(re => re.test(pathname));
}

// Ads that Google already placed (e.g. a sticky anchor ad) would otherwise stay
// on screen when a visitor moves on to the login screen or the app without a
// full page reload. This hides them; it never clicks or alters ads.
const HIDE_CSS = `
  ins.adsbygoogle, .google-auto-placed, ins[data-anchor-status], ins[data-vignette-status],
  iframe[id^="google_ads_iframe"] { display: none !important; }
`;

export function useAdSense(enabled: boolean) {
  useEffect(() => {
    // scripts/prerender.mjs sets this flag so Google's ad script, ad iframes and
    // tracking markup are never captured into the static HTML.
    if (typeof window !== 'undefined' && (window as unknown as { __PRERENDER__?: boolean }).__PRERENDER__) return;

    const hideStyle = document.getElementById(HIDE_STYLE_ID);

    if (!enabled) {
      if (!hideStyle && document.getElementById(SCRIPT_ID)) {
        const style = document.createElement('style');
        style.id = HIDE_STYLE_ID;
        style.textContent = HIDE_CSS;
        document.head.appendChild(style);
      }
      return;
    }

    hideStyle?.remove();
    if (document.getElementById(SCRIPT_ID)) return; // load once per page load

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;
    document.head.appendChild(script);
  }, [enabled]);
}
