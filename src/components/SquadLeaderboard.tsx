// src/components/SquadLeaderboard.tsx

import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Squad } from '../types';
import { getSquadLeaderboard, LeaderboardEntry } from '../services/leaderboardService';

interface SquadLeaderboardProps {
  squad: Squad;
}

export function SquadLeaderboard({ squad }: SquadLeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const memberUidsKey = squad.memberUids.join(',');

  useEffect(() => {
    let cancelled = false;
    const memberMeta = Object.fromEntries(
      squad.members.map((m) => [m.uid, { displayName: m.displayName, avatar: m.avatar }])
    );

    getSquadLeaderboard(squad.memberUids, memberMeta)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberUidsKey]);

  if (entries === null) {
    return (
      <div
        className="mt-3 h-16 rounded-xl animate-pulse"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        role="status"
        aria-label="Loading leaderboard"
      />
    );
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <div
      className="mt-3 rounded-xl p-3"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <Trophy size={12} className="text-yellow-400" />
        <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">This Week</span>
      </div>
      <div className="space-y-1.5">
        {entries.map((entry, i) => (
          <div key={entry.uid} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-dark-500 font-bold w-4 flex-shrink-0">{i + 1}</span>
              <span className="text-white truncate">{entry.displayName}</span>
            </div>
            <span className="text-dark-400 flex-shrink-0">{entry.completedBytesThisWeek} bytes</span>
          </div>
        ))}
      </div>
    </div>
  );
}
