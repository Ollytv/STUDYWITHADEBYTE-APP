// src/services/notificationCenter.ts
//
// Read-side API for the in-app Notification Center. Notifications are
// fanned out server-side (Cloud Functions, see functions/src/fcm.ts) to
// users/{uid}/notifications/{notificationId} — this module only reads them
// and toggles the `read` flag. Clients cannot create or delete notification
// docs (enforced in firestore.rules); only `read` is client-writable.

import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  doc,
  updateDoc,
  onSnapshot,
  where,
  writeBatch,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db, auth } from './firebase';

export interface StoredNotification {
  id:              string;
  title:           string;
  body:            string;
  imageUrl?:       string;
  deepLink?:       string;
  type:            string;
  read:            boolean;
  createdAt:       Date | null;
}

const PAGE_SIZE = 20;

function mapDoc(d: QueryDocumentSnapshot<DocumentData>): StoredNotification {
  const data = d.data();
  return {
    id:        d.id,
    title:     data.title ?? '',
    body:      data.body ?? '',
    imageUrl:  data.imageUrl,
    deepLink:  data.deepLink,
    type:      data.type ?? 'general',
    read:      !!data.read,
    createdAt: data.createdAt?.toDate?.() ?? null,
  };
}

/**
 * Fetches one page of the current user's notifications, newest first.
 * Pass the last item's raw snapshot cursor (via fetchNotificationPageRaw)
 * to page forward.
 */
export async function fetchNotificationPage(
  cursor?: QueryDocumentSnapshot<DocumentData>
): Promise<{ items: StoredNotification[]; nextCursor: QueryDocumentSnapshot<DocumentData> | null }> {
  const user = auth.currentUser;
  if (!user) return { items: [], nextCursor: null };

  const base = collection(db, 'users', user.uid, 'notifications');
  const q = cursor
    ? query(base, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE_SIZE))
    : query(base, orderBy('createdAt', 'desc'), limit(PAGE_SIZE));

  const snap = await getDocs(q);
  return {
    items: snap.docs.map(mapDoc),
    nextCursor: snap.docs.length === PAGE_SIZE ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  await updateDoc(doc(db, 'users', user.uid, 'notifications', notificationId), { read: true });
}

export async function markAllNotificationsRead(unreadIds: string[]): Promise<void> {
  const user = auth.currentUser;
  if (!user || unreadIds.length === 0) return;

  // Firestore batches cap at 500 writes
  for (let i = 0; i < unreadIds.length; i += 450) {
    const batch = writeBatch(db);
    unreadIds.slice(i, i + 450).forEach(id => {
      batch.update(doc(db, 'users', user.uid, 'notifications', id), { read: true });
    });
    await batch.commit();
  }
}

/**
 * Live unread-count subscription for a badge indicator. Returns an
 * unsubscribe function.
 */
export function subscribeUnreadCount(onCount: (count: number) => void): () => void {
  const user = auth.currentUser;
  if (!user) {
    onCount(0);
    return () => {};
  }

  const q = query(collection(db, 'users', user.uid, 'notifications'), where('read', '==', false));
  return onSnapshot(q, snap => onCount(snap.size), () => onCount(0));
}
