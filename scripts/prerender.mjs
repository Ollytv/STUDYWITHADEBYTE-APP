// scripts/prerender.mjs
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import handler from 'serve-handler';
import fs from 'fs/promises';
import path from 'path';

const DIST = path.resolve('dist');
const PORT = 4173;

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
  const server = createServer((req, res) => {
    // Only fall back to index.html for route requests (no file extension).
    // A blanket '**' rewrite also rewrites asset requests
    // (/assets/index-XXXX.js, .css, etc.) to index.html, which serves them
    // with a text/html MIME type — the browser then refuses to execute the
    // module script, React never mounts, and #root stays empty regardless
    // of how long you wait.
    const urlPath = req.url.split('?')[0];
    const isRoute = path.extname(urlPath) === '';
    return handler(req, res, {
      public: DIST,
      ...(isRoute ? { rewrites: [{ source: '**', destination: '/index.html' }] } : {}),
    });
  });
  await new Promise(resolve => server.listen(PORT, resolve));

  const browser = await puppeteer.launch({ headless: 'new' });

  for (const route of ROUTES) {
    const page = await browser.newPage();

    page.on('console', msg => console.log(`  [console:${msg.type()}] ${msg.text()}`));
    page.on('pageerror', err => console.error(`  [pageerror] ${err.message}`));
    page.on('requestfailed', req => console.warn(`  [requestfailed] ${req.url()} — ${req.failure()?.errorText}`));

    await page.evaluateOnNewDocument(() => {
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

      await page.goto(url, { waitUntil: 'networkidle2' });

      await page.waitForFunction(
        () => {
          const root = document.querySelector('#root');
          return !!root && root.children.length > 0;
        },
        { timeout: 15000 }
      ).catch(() => {
        console.warn(`  ⚠ #root never gained children within 15s for ${route}`);
      });

      await new Promise(r => setTimeout(r, 1500));

      const rootHTML = await page.$eval('#root', el => el.innerHTML).catch(() => '');
      if (!rootHTML || rootHTML.trim().length === 0) {
        console.warn(`  ⚠ #root is EMPTY for ${route}`);
      }

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
