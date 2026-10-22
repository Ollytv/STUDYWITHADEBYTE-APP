import { Newspaper, RefreshCw } from 'lucide-react';
import { useNews, timeAgo, CATEGORY_COLORS, CATEGORY_LABELS } from '../../hooks/useNews';

interface Props {
  /** Called when the student taps "See all". Hide the link by omitting it. */
  onSeeAll?: () => void;
  limit?: number;
}

export function CampusPulseCard({ onSeeAll, limit = 4 }: Props) {
  const { items, loading, error, refresh } = useNews();
  const shown = items.slice(0, limit);

  return (
    <section
      aria-label="Campus news"
      className="rounded-2xl overflow-hidden"
      style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <Newspaper size={15} className="text-green-400" />
          <h2 className="text-sm font-black text-content-primary" style={{ fontFamily: 'Georgia, serif' }}>
            Campus Pulse
          </h2>
        </div>
        {onSeeAll && items.length > 0 && (
          <button
            onClick={onSeeAll}
            className="text-xs font-semibold text-green-400 hover:text-green-300 px-2 py-1 -mr-2 rounded-lg touch-manipulation"
          >
            See all
          </button>
        )}
      </div>

      {loading && (
        <div className="px-4 pb-4 space-y-3" aria-busy="true" aria-label="Loading news">
          {[0, 1, 2].map(i => (
            <div key={i} className="space-y-2">
              <div className="h-3 rounded animate-pulse" style={{ width: `${92 - i * 12}%`, background: 'var(--border-color)' }} />
              <div className="h-2.5 rounded animate-pulse w-1/3" style={{ background: 'var(--border-color)' }} />
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="px-4 pb-4">
          <p className="text-xs text-content-secondary mb-3">News did not load. Check your connection and try again.</p>
          <button
            onClick={refresh}
            className="flex items-center gap-1.5 text-xs font-semibold text-content-primary px-3 py-2 rounded-xl touch-manipulation"
            style={{ border: '1px solid var(--border-strong)' }}
          >
            <RefreshCw size={12} /> Try again
          </button>
        </div>
      )}

      {!loading && !error && shown.length === 0 && (
        <p className="px-4 pb-4 text-xs text-content-secondary">No news yet. Check back later.</p>
      )}

      {!loading && shown.length > 0 && (
        <ul className="pb-1">
          {shown.map(item => (
            <li key={item.id} className="border-t first:border-t-0" style={{ borderColor: 'var(--border-color)' }}>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-3 px-4 py-3 hover:bg-surface-card transition-colors"
              >
                <span
                  className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: CATEGORY_COLORS[item.category] }}
                  aria-label={CATEGORY_LABELS[item.category]}
                />
                <span className="min-w-0">
                  <span
                    className="block text-[13px] font-semibold text-content-primary leading-snug"
                    style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                  >
                    {item.title}
                  </span>
                  <span className="block mt-1 text-[11px] text-content-muted truncate">
                    {item.source}, {timeAgo(item.publishedAt)}
                  </span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
