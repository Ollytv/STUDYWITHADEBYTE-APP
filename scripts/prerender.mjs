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
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        configurable: true,
      });
    });
    page.setDefaultNavigationTimeout(30000);

    try {
      const url = `http://localhost:${PORT}${route}`;
      await page.goto(url, { waitUntil: 'networkidle0' });
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