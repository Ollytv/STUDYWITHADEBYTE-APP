// src/hooks/useNotificationCenter.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import {
  fetchNotificationPage,
  markNotificationRead,
  markAllNotificationsRead,
  subscribeUnreadCount,
  StoredNotification,
} from '../services/notificationCenter';

export function useNotificationCenter() {
  const [items, setItems]         = useState<StoredNotification[]>([]);
  const [loading, setLoading]     = useState(false);
  const [hasMore, setHasMore]     = useState(true);
  const [unreadCount, setUnread]  = useState(0);
  const cursorRef = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const { items: page, nextCursor } = await fetchNotificationPage(cursorRef.current ?? undefined);
      setItems(prev => [...prev, ...page]);
      cursorRef.current = nextCursor;
      setHasMore(!!nextCursor);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore]);

  const reset = useCallback(async () => {
    cursorRef.current = null;
    setItems([]);
    setHasMore(true);
    setLoading(true);
    try {
      const { items: page, nextCursor } = await fetchNotificationPage();
      setItems(page);
      cursorRef.current = nextCursor;
      setHasMore(!!nextCursor);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reset();
    const unsub = subscribeUnreadCount(setUnread);
    return unsub;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markRead = useCallback(async (id: string) => {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    await markNotificationRead(id);
  }, []);

  const markAllRead = useCallback(async () => {
    const unreadIds = items.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setItems(prev => prev.map(n => ({ ...n, read: true })));
    await markAllNotificationsRead(unreadIds);
  }, [items]);

  return { items, loading, hasMore, unreadCount, loadMore, refresh: reset, markRead, markAllRead };
}
