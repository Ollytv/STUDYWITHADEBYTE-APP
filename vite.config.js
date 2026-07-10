// vite.config.ts
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig(function (_a) {
    var mode = _a.mode;
    // Load env vars so we can validate them at build time and inject into SW
    var env = loadEnv(mode, process.cwd(), '');
    // ── Build-time env var validation ─────────────────────────────────────────
    var REQUIRED = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID',
    ];
    var missing = REQUIRED.filter(function (k) { return !env[k]; });
    if (missing.length > 0) {
        throw new Error("\n[vite.config] Missing required environment variables:\n  ".concat(missing.join('\n  '), "\n") +
            'Add them to your .env file or Netlify environment variable settings.\n');
    }
    return {
        plugins: [
            react(),
            VitePWA({
                registerType: 'autoUpdate',
                includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
                manifest: {
                    name: 'StudyWithAdebyte',
                    short_name: 'StudiByte',
                    description: 'Smart Timetable & Attendance Tracker for POLYIBADAN Students',
                    theme_color: '#0a0a0a',
                    background_color: '#0a0a0a',
                    display: 'standalone',
                    orientation: 'portrait',
                    scope: '/',
                    start_url: '/',
                    icons: [
                        { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
                        { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
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
                    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
                    navigateFallbackDenylist: [
                        /^\/api\//,
                        /firebaseio\.com/,
                        /googleapis\.com/,
                    ],
                    runtimeCaching: [
                        {
                            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'google-fonts-cache',
                                expiration: {
                                    maxEntries: 10,
                                    maxAgeSeconds: 60 * 60 * 24 * 365,
                                },
                            },
                        },
                        {
                            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
                            handler: 'CacheFirst',
                            options: {
                                cacheName: 'google-fonts-files',
                                expiration: {
                                    maxEntries: 20,
                                    maxAgeSeconds: 60 * 60 * 24 * 365,
                                },
                            },
                        },
                        {
                            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
                            handler: 'NetworkFirst',
                            options: {
                                cacheName: 'firebase-storage-cache',
                                expiration: {
                                    maxEntries: 50,
                                    maxAgeSeconds: 60 * 60 * 24 * 7,
                                },
                                networkTimeoutSeconds: 10,
                            },
                        },
                    ],
                },
            }),
        ],
        build: {
            target: 'es2020',
            chunkSizeWarningLimit: 500,
            rollupOptions: {
                output: {
                    manualChunks: function (id) {
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
        optimizeDeps: {
            exclude: ['pdfjs-dist'],
        },
    };
});
