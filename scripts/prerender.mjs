// scripts/prerender.mjs
import puppeteer from 'puppeteer';
import { createServer } from 'http';
import handler from 'serve-handler';
import fs from 'fs/promises';
import path from 'path';

const DIST = path.resolve('dist');
const PORT = 4173;

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
  const server = createServer((req, res) => handler(req, res, { public: DIST }));
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
    page.setDefaultNavigationTimeout(30000);

    try {
      const url = `http://localhost:${PORT}${route}`;
      console.log(`Rendering ${route}...`);
      await page.goto(url, { waitUntil: 'networkidle0' });

      // give client-side state (auth checks, etc.) a moment to settle
      await new Promise(r => setTimeout(r, 1500));

      const rootHTML = await page.$eval('#root', el => el.innerHTML).catch(() => '');
      if (!rootHTML || rootHTML.trim().length === 0) {
        console.warn(`  ⚠ #root is EMPTY for ${route}`);
      }

      const html = await page.content();
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