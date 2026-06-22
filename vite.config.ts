// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  // Load env vars so we can validate them at build time and inject into SW
  const env = loadEnv(mode, process.cwd(), '');

  // ── Build-time env var validation ─────────────────────────────────────────
  // Fail the build immediately if any required Firebase variable is missing.
  // This prevents deploying a broken app that silently fails to connect.
  const REQUIRED = [
    'VITE_FIREBASE_API_KEY',
    'VITE_FIREBASE_AUTH_DOMAIN',
    'VITE_FIREBASE_PROJECT_ID',
    'VITE_FIREBASE_STORAGE_BUCKET',
    'VITE_FIREBASE_MESSAGING_SENDER_ID',
    'VITE_FIREBASE_APP_ID',
  ];
  const missing = REQUIRED.filter(k => !env[k]);
  if (missing.length > 0) {
    throw new Error(
      `\n[vite.config] Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
      'Add them to your .env file or Netlify environment variable settings.\n'
    );
  }

  return {
    plugins: [
      react(),
      

      VitePWA({
        registerType: 'autoUpdate',

        // Assets to precache — the SW will serve these offline
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],

        manifest: {
          name:             'StudyWithAdebyte',
          short_name:       'StudiByte',
          description:      'Smart Timetable & Attendance Tracker for POLYIBADAN Students',
          theme_color:      '#0a0a0a',
          background_color: '#0a0a0a',
          display:          'standalone',
          orientation:      'portrait',
          scope:            '/',
          start_url:        '/',
          icons: [
            { src: 'icons/icon-72x72.png',   sizes: '72x72',   type: 'image/png' },
            { src: 'icons/icon-96x96.png',   sizes: '96x96',   type: 'image/png' },
            { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            {
              src: 'icons/icon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any maskable',
            },
            { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            {
              src: 'icons/icon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any maskable',
            },
          ],
        },

        workbox: {
          // Precache all built assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

          // Never let Workbox intercept Firebase API calls — they must always
          // go to the network so auth tokens and Firestore writes are live.
          navigateFallbackDenylist: [
            /^\/api\//,
            /firebaseio\.com/,
            /googleapis\.com/,
          ],

          runtimeCaching: [
            // Cache Google Fonts for 1 year (they are versioned by Google)
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler:    'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: {
                  maxEntries:    10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            // Cache font files themselves for 1 year
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler:    'CacheFirst',
              options: {
                cacheName: 'google-fonts-files',
                expiration: {
                  maxEntries:    20,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
            // Firebase Storage downloads — NetworkFirst so users always get
            // the latest file, with a cache fallback when offline
            {
              urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
              handler:    'NetworkFirst',
              options: {
                cacheName: 'firebase-storage-cache',
                expiration: {
                  maxEntries:    50,
                  maxAgeSeconds: 60 * 60 * 24 * 7, // 1 week
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
      }),
    ],

    // ── Build optimisation ──────────────────────────────────────────────────
    build: {
      // Target modern browsers — smaller bundles, native ES modules
      target: 'es2020',

      // Warn when any chunk exceeds 500KB (helps catch accidental large imports)
      chunkSizeWarningLimit: 500,

      rollupOptions: {
        output: {
          // Manual chunk splitting — separates large dependencies into their own
          // files so the browser can cache them independently of app code changes.
        manualChunks(id) {
  if (id.includes('react')) {
    return 'vendor-react';
  }

  if (id.includes('firebase')) {
    return 'vendor-firebase';
  }

  if (id.includes('framer-motion')) {
    return 'vendor-motion';
  }

  if (id.includes('zustand')) {
    return 'vendor-zustand';
  }
}
        },
      },
    },

    // ── Dependency pre-bundling ─────────────────────────────────────────────
    optimizeDeps: {
      // pdfjs-dist uses dynamic imports internally — exclude from pre-bundling
      // to avoid Vite's CommonJS transform breaking its worker loading
      exclude: ['pdfjs-dist'],
    },
  };
});