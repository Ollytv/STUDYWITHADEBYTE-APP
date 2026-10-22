// functions/api/news.ts
//
// Cloudflare Pages Function — GET /api/news
// Public, read-only campus & education news feed (no user data, no secrets
// in the response). All the work lives in ./_lib/news.ts.

import { getNews, NewsEnv } from './_lib/news';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extra },
  });
}

export const onRequestOptions: PagesFunction<NewsEnv> = async () =>
  new Response(null, { status: 204, headers: CORS_HEADERS });

export const onRequestGet: PagesFunction<NewsEnv> = async ({ env, waitUntil }) => {
  try {
    const payload = await getNews(env, waitUntil);
    return json(200, payload, { 'Cache-Control': 'public, max-age=300' });
  } catch (err) {
    console.error('[news] unavailable:', err);
    return json(502, { error: 'News is unavailable right now' });
  }
};

// Any other method (method-specific handlers above take precedence).
export const onRequest: PagesFunction<NewsEnv> = async () => json(405, { error: 'Method not allowed' }, { Allow: 'GET, OPTIONS' });
