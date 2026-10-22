import { useCallback, useEffect, useState } from 'react';

export type NewsCategory = 'scholarships' | 'exams' | 'campus' | 'fees' | 'careers';

export interface NewsItem {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  category: NewsCategory;
}

interface NewsPayload { updatedAt: string; items: NewsItem[] }

export const CATEGORY_LABELS: Record<NewsCategory, string> = {
  scholarships: 'Scholarships',
  exams: 'Exams',
  campus: 'Campus',
  fees: 'School fees',
  careers: 'Careers',
};

// Dot colours so a category is recognisable without reading the label.
export const CATEGORY_COLORS: Record<NewsCategory, string> = {
  scholarships: '#22c55e',
  exams: '#60a5fa',
  campus: '#f59e0b',
  fees: '#f472b6',
  careers: '#a78bfa',
};

const API_BASE = (import.meta as any).env?.VITE_API_BASE ?? '';
const STORAGE_KEY = 'studibyte:news:v1';

// Shared across every component that calls useNews, so the dashboard card and
// the News page never trigger two requests.
let memory: NewsPayload | null = null;
let inflight: Promise<NewsPayload> | null = null;

function readStored(): NewsPayload | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as NewsPayload) : null;
  } catch { return null; }
}

function load(): Promise<NewsPayload> {
  if (inflight) return inflight;
  inflight = fetch(`${API_BASE}/api/news`)
    .then(async res => {
      if (!res.ok) throw new Error(`News request failed (${res.status})`);
      const data = (await res.json()) as NewsPayload;
      if (!Array.isArray(data.items)) throw new Error('Unexpected news response');
      memory = data;
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* storage full or blocked */ }
      return data;
    })
    .finally(() => { inflight = null; });
  return inflight;
}

export function useNews() {
  const [data, setData] = useState<NewsPayload | null>(() => memory ?? readStored());
  const [loading, setLoading] = useState(!data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (force = false) => {
    setError(null);
    if (force) setRefreshing(true);
    try {
      const fresh = await load();
      setData(fresh);
    } catch (e) {
      // Keep showing whatever we already had; only surface the error if we have nothing.
      setError(e instanceof Error ? e.message : 'Could not load news');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void run(); }, [run]);

  return {
    items: data?.items ?? [],
    updatedAt: data?.updatedAt ?? null,
    loading,
    refreshing,
    error: data ? null : error, // a stale list beats an error screen
    refresh: () => run(true),
  };
}

export function timeAgo(iso: string, now = Date.now()): string {
  const mins = Math.floor((now - Date.parse(iso)) / 60000);
  if (!isFinite(mins) || mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? 'Yesterday' : days < 30 ? `${days} days ago` : 'Over a month ago';
}
