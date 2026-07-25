// src/services/leaderboardService.ts
//
// Friends/squad-only, weekly-reset leaderboard. Deliberately scoped to a
// single squad's memberUids rather than a global collection — ranking
// against strangers demotivates low performers, and it also sidesteps the
// need for a separate global-leaderboard collection/rules surface.

import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface LeaderboardEntry {
  uid: string;
  displayName: string;
  avatar?: string;
  completedBytesThisWeek: number;
}

/** ISO date of the most recent Monday (start of the current tracking week). */
function startOfWeekISO(now: Date = new Date()): string {
  const day = now.getDay(); // 0 = Sunday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Ranks squad members by completed-bytes-this-week. Requires a composite
 * index on dailyBytes (date ASC, completed ASC) per member — created lazily
 * per Firestore's usual missing-index error link on first query.
 */
export async function getSquadLeaderboard(
  memberUids: string[],
  memberMeta: Record<string, { displayName: string; avatar?: string }>
): Promise<LeaderboardEntry[]> {
  const weekStart = startOfWeekISO();

  const entries = await Promise.all(
    memberUids.map(async (uid) => {
      const bytesRef = collection(db, 'users', uid, 'dailyBytes');
      const q = query(bytesRef, where('date', '>=', weekStart), where('completed', '==', true));
      const snap = await getDocs(q);

      return {
        uid,
        displayName: memberMeta[uid]?.displayName ?? 'Student',
        avatar: memberMeta[uid]?.avatar,
        completedBytesThisWeek: snap.size,
      };
    })
  );

  return entries.sort((a, b) => b.completedBytesThisWeek - a.completedBytesThisWeek);
}
