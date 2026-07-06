// src/components/ui/NotificationCenter.tsx
//
// Drop-in notification inbox. Matches the StudiByte dark/emerald design
// system used across NotificationAlert / NotificationSettings.
//
// Usage:
//   import { NotificationCenter } from '../components/ui/NotificationCenter';
//   <NotificationCenter />

import { Bell, CheckCheck, Circle, Image as ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNotificationCenter } from '../../hooks/useNotificationCenter';
import type { StoredNotification } from '../../services/notificationCenter';

function formatTimestamp(date: Date | null): string {
  if (!date) return '';
  const diffMs = Date.now() - date.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function NotificationRow({
  notification,
  onClick,
}: {
  notification: StoredNotification;
  onClick: (n: StoredNotification) => void;
}) {
  return (
    <button
      onClick={() => onClick(notification)}
      className="w-full flex items-start gap-3 px-4 py-3.5 text-left rounded-xl transition-colors"
      style={{
        background: notification.read ? 'transparent' : 'rgba(34,197,94,0.05)',
        border: '1px solid rgba(255,255,255,0.05)',
      }}
    >
      <div className="shrink-0 mt-0.5">
        {notification.read ? (
          <div className="w-2 h-2" />
        ) : (
          <Circle size={8} className="text-green-400 fill-green-400" />
        )}
      </div>

      {notification.imageUrl ? (
        <img
          src={notification.imageUrl}
          alt=""
          className="shrink-0 w-10 h-10 rounded-lg object-cover"
        />
      ) : (
        <div className="shrink-0 w-10 h-10 rounded-lg bg-dark-800 flex items-center justify-center">
          <ImageIcon size={14} className="text-dark-600" />
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className={`text-sm leading-snug ${notification.read ? 'text-dark-300' : 'text-white font-bold'}`}>
          {notification.title}
        </p>
        <p className="text-xs text-dark-500 mt-0.5 line-clamp-2">{notification.body}</p>
        <p className="text-[10px] text-dark-600 mt-1">{formatTimestamp(notification.createdAt)}</p>
      </div>
    </button>
  );
}

export function NotificationCenter() {
  const { items, loading, hasMore, unreadCount, loadMore, markRead, markAllRead } = useNotificationCenter();
  const navigate = useNavigate();

  const handleClick = async (n: StoredNotification) => {
    if (!n.read) await markRead(n.id);
    if (n.deepLink) navigate(n.deepLink);
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center justify-between px-1 mb-3">
        <div className="flex items-center gap-2">
          <Bell size={14} className="text-green-400" />
          <span className="text-xs font-black text-green-400/80 uppercase tracking-widest">
            Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
          </span>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-[11px] font-bold text-dark-400 hover:text-green-400 transition-colors"
          >
            <CheckCheck size={12} /> Mark all read
          </button>
        )}
      </div>

      {items.length === 0 && !loading && (
        <div className="text-center py-12">
          <Bell size={24} className="text-dark-700 mx-auto mb-2" />
          <p className="text-sm text-dark-500">You're all caught up.</p>
        </div>
      )}

      <div className="space-y-1.5">
        {items.map(n => (
          <NotificationRow key={n.id} notification={n} onClick={handleClick} />
        ))}
      </div>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="w-full mt-4 py-2.5 text-xs font-bold text-dark-400 hover:text-white transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  );
}