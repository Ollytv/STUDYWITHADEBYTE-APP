import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Newspaper, RefreshCw } from 'lucide-react';
import { EmptyState } from '../components/ui/EmptyState';
import {
  useNews, timeAgo, CATEGORY_COLORS, CATEGORY_LABELS, NewsCategory,
} from '../hooks/useNews';

const TABS = ['all', 'scholarships', 'exams', 'campus', 'fees', 'careers'] as const;
type Tab = (typeof TABS)[number];

export default function News() {
  const { items, loading, refreshing, error, refresh, updatedAt } = useNews();
  const [tab, setTab] = useState<Tab>('all');

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const i of items) c[i.category] = (c[i.category] ?? 0) + 1;
    return c;
  }, [items]);

  const visible = tab === 'all' ? items : items.filter(i => i.category === tab);

  return (
    <div className="min-h-screen bg-surface-base pb-28">
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'var(--nav-bg)' }}>
        <div className="px-5 pt-14 pb-3 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-content-primary" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}>
              Campus Pulse
            </h1>
            <p className="text-xs text-content-secondary">
              {updatedAt ? `Updated ${timeAgo(updatedAt)}` : 'Education news for Nigerian students'}
            </p>
          </div>
          <motion.button
            onClick={refresh}
            disabled={refreshing}
            aria-label="Refresh news"
            className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation text-content-secondary disabled:opacity-50"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
            whileTap={{ scale: 0.9 }}
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </motion.button>
        </div>

        <div className="px-5 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="tablist" aria-label="News categories">
            {TABS.map(t => {
              const active = tab === t;
              const n = counts[t] ?? 0;
              return (
                <button
                  key={t}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setTab(t)}
                  className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold touch-manipulation flex items-center gap-1.5 ${active ? '' : 'text-content-secondary'}`}
                  style={active
                    ? { background: 'linear-gradient(135deg, #22c55e, #059669)', color: '#000', boxShadow: '0 0 12px rgba(34,197,94,0.25)' }
                    : { background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                >
                  {t === 'all' ? 'All' : CATEGORY_LABELS[t as NewsCategory]}
                  {n > 0 && (
                    <span
                      className="text-[9px] font-black px-1.5 py-0.5 rounded-lg"
                      style={{ background: active ? 'rgba(0,0,0,0.2)' : 'var(--border-color)', color: active ? '#000' : 'inherit' }}
                    >
                      {n}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 pt-2">
        {loading && (
          <div className="space-y-3" aria-busy="true">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="rounded-2xl p-4 space-y-2.5" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
                <div className="h-3.5 rounded animate-pulse w-11/12" style={{ background: 'var(--border-color)' }} />
                <div className="h-3.5 rounded animate-pulse w-2/3" style={{ background: 'var(--border-color)' }} />
                <div className="h-2.5 rounded animate-pulse w-1/3" style={{ background: 'var(--border-color)' }} />
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState
            icon={<Newspaper size={28} />}
            title="News did not load"
            description="Check your connection and try again."
            action={{ label: 'Try again', onClick: refresh }}
          />
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState
            icon={<Newspaper size={28} />}
            title="Nothing here yet"
            description={tab === 'all' ? 'New stories will show up here.' : 'No recent stories in this category.'}
            action={tab === 'all' ? undefined : { label: 'Show all news', onClick: () => setTab('all') }}
          />
        )}

        {!loading && visible.length > 0 && (
          <ul className="space-y-3 pb-4">
            {visible.map(item => (
              <li key={item.id}>
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded-2xl p-4 active:scale-[0.99] active:opacity-90 transition"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
                >
                  <span className="flex items-center gap-2 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: CATEGORY_COLORS[item.category] }} />
                    <span className="text-[11px] font-semibold" style={{ color: CATEGORY_COLORS[item.category] }}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </span>
                  <span className="block text-sm font-semibold text-content-primary leading-snug">{item.title}</span>
                  <span className="flex items-center gap-3 mt-2 text-[11px] text-content-muted">
                    <span className="truncate">{item.source}</span>
                    <span className="shrink-0">{timeAgo(item.publishedAt)}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
