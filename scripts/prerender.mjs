// scripts/prerender.mjs
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import handler from 'serve-handler';
import fs from 'fs/promises';
import path from 'path';

const DIST = path.resolve('dist');
const PORT = 4173;

// The real production origin. Puppeteer has to navigate to a *local* server
// to render the page (there's nothing else to render against at build time),
// so any code that derives canonical URLs, og:url, JSON-LD, or hreflang tags
// from `window.location.origin` bakes in `http://localhost:4173` instead of
// this. That's almost certainly why your head has localhost links in it —
// find that code (search the repo for `location.origin` / `location.href`
// in SEO/meta components) and have it read this value at build/runtime
// instead. Set this from an env var so staging/prod can differ if needed.
const PRODUCTION_ORIGIN = process.env.VITE_SITE_URL || 'https://studibyte.space';

const ROUTES = [
  '/',
  '/about',
  '/privacy',
  '/terms',
  '/guides',
  '/guides/active-recall-for-coding',
  '/guides/python-loops-made-easy',
  '/guides/how-to-calculate-cgpa-nigeria',
];

async function main() {
  const server = createServer((req, res) =>
    handler(req, res, {
      public: DIST,
      // Without this, serve-handler 404s any route that isn't a real file on
      // disk (e.g. /about) instead of falling back to index.html — which is
      // what lets React Router mount and render that route client-side.
      // That 404 is exactly why #root came back empty for /about.
      rewrites: [{ source: '**', destination: '/index.html' }],
    })
  );
  await new Promise(resolve => server.listen(PORT, resolve));

  const browser = await puppeteer.launch({ headless: 'new' });

  for (const route of ROUTES) {
    const page = await browser.newPage();

    // 👇 surface whatever is actually failing
    page.on('console', msg => console.log(`  [console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.error(`  [pageerror] ${err.message}`));
    page.on('requestfailed', req => console.warn(`  [requestfailed] ${req.url()} — ${req.failure()?.errorText}`));

    await page.evaluateOnNewDocument(() => {
      // Redefine as configurable, then DELETE it — setting value: undefined
      // leaves the key present, so `'serviceWorker' in navigator` still
      // returns true and fools feature-detection code (e.g. Firebase
      // Messaging's isSupported()) into thinking SW is available, which
      // then crashes when it tries to touch `.ready` / `.register()`.
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });
      delete navigator.serviceWorker;
    });
    page.setDefaultNavigationTimeout(45000);

    try {
      const url = `http://localhost:${PORT}${route}`;
      console.log(`Rendering ${route}...`);

      // networkidle0 requires zero open connections for 500ms — Firestore's
      // realtime channel and Analytics beacons keep a connection open
      // indefinitely, so that condition never fires and Puppeteer always
      // times out. networkidle2 (≤2 open connections) tolerates that
      // background traffic while still waiting for the page's own asset
      // requests to settle.
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Belt-and-suspenders: also explicitly wait for #root to actually
      // have rendered children, rather than trusting network timing alone
      // to mean "the page is ready".
      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return !!root && root.children.length > 0;
        },
        { timeout: 15000 }
      ).catch(() => {
        console.warn(`  ⚠ #root never gained children within 15s for ${route}`);
      });

      // give client-side state (auth checks, etc.) a moment to settle
      await new Promise(r => setTimeout(r, 1500));

      const rootHTML = await page.$eval('#root', el => el.innerHTML).catch(() => '');
      if (!rootHTML || rootHTML.trim().length === 0) {
        console.warn(`  ⚠ #root is EMPTY for ${route}`);
      }

      // Safety net: even after fixing the source of the leak, strip any
      // remaining references to the local prerender server so a regression
      // there can never ship localhost links to production again.
      const localOrigin = `http://localhost:${PORT}`;
      const html = (await page.content()).split(localOrigin).join(PRODUCTION_ORIGIN);

      const outDir = route === '/' ? DIST : path.join(DIST, route);
      await fs.mkdir(outDir, { recursive: true });
      await fs.writeFile(path.join(outDir, 'index.html'), html, 'utf8');
      console.log(`Prerendered: ${route}`);
    } catch (err) {
      console.error(`Failed to prerender ${route}:`, err.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  server.close();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});