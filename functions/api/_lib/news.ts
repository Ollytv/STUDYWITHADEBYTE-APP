/**
 * Campus & education news for StudiByte (Cloudflare Pages Function helper).
 *
 * - Pulls Google News RSS (free, no key) for a few student-focused searches.
 * - Optionally adds NewsData.io results when NEWSDATA_API_KEY is set.
 * - Caches ONE merged list in KV so every user shares a single fetch.
 * - Pages Functions have no cron, so the cache refreshes itself: when a
 *   request finds it older than REFRESH_AFTER_MS it serves the cached copy
 *   and rebuilds in the background (waitUntil).
 */

export interface NewsEnv {
  /** Optional dedicated namespace. Falls back to RATE_LIMIT_KV if not bound. */
  NEWS_KV?: KVNamespace;
  RATE_LIMIT_KV: KVNamespace;
  NEWSDATA_API_KEY?: string; // optional
}

const kvOf = (env: NewsEnv) => env.NEWS_KV ?? env.RATE_LIMIT_KV;

export type NewsCategory = 'scholarships' | 'exams' | 'campus' | 'fees' | 'careers';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string; // ISO
  category: NewsCategory;
}

export interface NewsPayload {
  updatedAt: string; // ISO
  items: NewsItem[];
}

const CACHE_KEY = 'news:v1';
const REFRESH_AFTER_MS = 3 * 60 * 60 * 1000; // refresh when older than 3 hours
const KV_TTL_SECONDS = 24 * 60 * 60;          // keep stale copy for a day as a fallback
const MAX_AGE_DAYS = 30;
const PER_CATEGORY = 12;

// One Google News search per category. Tweak these to change what students see.
const QUERIES: Record<NewsCategory, string> = {
  scholarships: 'scholarship Nigeria students',
  exams: 'JAMB OR WAEC OR NECO OR UTME OR "post-UTME"',
  campus: 'Nigerian university ASUU OR strike OR resumption OR convocation',
  fees: '"school fees" Nigeria university OR polytechnic',
  careers: 'Nigeria graduates internship OR NYSC OR "graduate trainee"',
};

// ---------- small helpers ----------

const decodeEntities = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const pick = (block: string, tag: string) => {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return m ? decodeEntities(m[1]) : '';
};

const safeUrl = (u: string) => (/^https:\/\//i.test(u) ? u : '');

const normTitle = (t: string) => t.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

async function hash(s: string) {
  const buf = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].slice(0, 6).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ---------- sources ----------

/** Parse a Google News RSS document. Exported so it can be tested. */
export function parseGoogleRss(xml: string, category: NewsCategory) {
  const items: Omit<NewsItem, 'id'>[] = [];
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
  for (const b of blocks) {
    let title = pick(b, 'title');
    const url = safeUrl(pick(b, 'link'));
    const date = new Date(pick(b, 'pubDate'));
    let source = pick(b, 'source');
    // Google appends " - Source Name" to the headline
    const m = title.match(/^(.*)\s+-\s+([^-]+)$/);
    if (m) {
      title = m[1].trim();
      if (!source) source = m[2].trim();
    }
    if (!title || !url || isNaN(date.getTime())) continue;
    items.push({ title, url, source: source || 'News', publishedAt: date.toISOString(), category });
  }
  return items;
}

async function fetchGoogle(category: NewsCategory) {
  const q = encodeURIComponent(QUERIES[category] + ' when:30d');
  const url = `https://news.google.com/rss/search?q=${q}&hl=en-NG&gl=NG&ceid=NG:en`;
  const res = await fetch(url, { headers: { 'User-Agent': 'StudiByte/1.0' } });
  if (!res.ok) throw new Error(`google ${category} ${res.status}`);
  return parseGoogleRss(await res.text(), category);
}

/** Optional extra source. Only runs when a key is configured. */
async function fetchNewsData(key: string) {
  const url =
    `https://newsdata.io/api/1/latest?apikey=${encodeURIComponent(key)}` +
    `&country=ng&language=en&category=education`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`newsdata ${res.status}`);
  const json: any = await res.json();
  const out: Omit<NewsItem, 'id'>[] = [];
  for (const r of json?.results ?? []) {
    const link = safeUrl(r.link ?? '');
    const date = new Date(String(r.pubDate ?? '').replace(' ', 'T') + 'Z'); // pubDate is UTC
    if (!r.title || !link || isNaN(date.getTime())) continue;
    out.push({
      title: String(r.title).trim(),
      url: link,
      source: r.source_name || r.source_id || 'News',
      publishedAt: date.toISOString(),
      category: 'campus',
    });
  }
  return out;
}

// ---------- build + cache ----------

export async function buildNews(env: NewsEnv): Promise<NewsPayload> {
  const cats = Object.keys(QUERIES) as NewsCategory[];
  const jobs: Promise<Omit<NewsItem, 'id'>[]>[] = cats.map(c => fetchGoogle(c));
  if (env.NEWSDATA_API_KEY) jobs.push(fetchNewsData(env.NEWSDATA_API_KEY));

  // One failing source must not take the whole feed down.
  const settled = await Promise.allSettled(jobs);
  const raw = settled.flatMap(s => (s.status === 'fulfilled' ? s.value : []));
  settled.forEach(s => s.status === 'rejected' && console.warn('[news]', String(s.reason)));
  if (raw.length === 0) throw new Error('all news sources failed');

  const cutoff = Date.now() - MAX_AGE_DAYS * 86_400_000;
  const seen = new Set<string>();
  const counts: Record<string, number> = {};
  const items: NewsItem[] = [];

  raw.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  for (const it of raw) {
    if (Date.parse(it.publishedAt) < cutoff) continue;
    const key = normTitle(it.title);
    if (seen.has(key)) continue;
    if ((counts[it.category] ?? 0) >= PER_CATEGORY) continue;
    seen.add(key);
    counts[it.category] = (counts[it.category] ?? 0) + 1;
    items.push({ ...it, id: await hash(it.url) });
  }
  return { updatedAt: new Date().toISOString(), items };
}

/** Fetch fresh news and store it. Call this from your cron (scheduled) handler. */
export async function refreshNews(env: NewsEnv): Promise<NewsPayload> {
  const payload = await buildNews(env);
  await kvOf(env).put(CACHE_KEY, JSON.stringify(payload), { expirationTtl: KV_TTL_SECONDS });
  return payload;
}

/**
 * Returns the cached feed, building it on first use and refreshing in the
 * background when stale. Throws only if there is no cache AND every source fails.
 */
export async function getNews(env: NewsEnv, waitUntil: (p: Promise<unknown>) => void): Promise<NewsPayload> {
  const cached = (await kvOf(env).get(CACHE_KEY, 'json')) as NewsPayload | null;
  if (cached) {
    const age = Date.now() - Date.parse(cached.updatedAt);
    if (age > REFRESH_AFTER_MS) {
      waitUntil(refreshNews(env).catch(e => console.warn('[news] refresh failed:', String(e))));
    }
    return cached;
  }
  return refreshNews(env);
}
