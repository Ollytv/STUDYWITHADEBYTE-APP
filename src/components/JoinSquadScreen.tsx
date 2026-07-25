// src/components/JoinSquadScreen.tsx
//
// Route target for squad invite links, e.g. /squads/join/:squadId.
// Uses previewSquad (Cloud Function) since a non-member has no direct
// Firestore read path on a squad doc — see firestore.rules.

import { useEffect, useState } from 'react';
import { previewSquad, joinSquad } from '../services/squadService';

interface JoinSquadScreenProps {
  squadId: string;
  onJoined: (squadId: string) => void;
  onCancel: () => void;
}

type Status = 'loading' | 'ready' | 'joining' | 'error' | 'not-found' | 'full';

export function JoinSquadScreen({ squadId, onJoined, onCancel }: JoinSquadScreenProps) {
  const [status, setStatus] = useState<Status>('loading');
  const [preview, setPreview] = useState<{ name: string; memberCount: number; dailyGoalMinutes: number } | null>(null);

  useEffect(() => {
    let cancelled = false;

    previewSquad(squadId)
      .then((data) => {
        if (cancelled) return;
        setPreview(data);
        setStatus(data.isFull ? 'full' : 'ready');
      })
      .catch(() => {
        if (!cancelled) setStatus('not-found');
      });

    return () => {
      cancelled = true;
    };
  }, [squadId]);

  async function handleJoin() {
    setStatus('joining');
    try {
      await joinSquad(squadId);
      onJoined(squadId);
    } catch {
      setStatus('error');
    }
  }

  if (status === 'loading') {
    return (
      <div role="status" aria-live="polite" className="p-6 text-center text-neutral-400">
        Loading invite…
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <div className="p-6 text-center">
        <p className="text-neutral-300">This squad invite is no longer valid.</p>
        <button onClick={onCancel} className="mt-3 text-sm text-emerald-400 underline">
          Go back
        </button>
      </div>
    );
  }

  if (status === 'full') {
    return (
      <div className="p-6 text-center">
        <p className="text-neutral-300">
          {preview?.name ?? 'This squad'} is full (max 8 members).
        </p>
        <button onClick={onCancel} className="mt-3 text-sm text-emerald-400 underline">
          Go back
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-sm rounded-xl bg-neutral-900 p-6 text-center">
      <h2 className="text-lg font-semibold text-neutral-100">
        Join "{preview?.name}"?
      </h2>
      <p className="mt-1 text-sm text-neutral-400">
        {preview?.memberCount} member{preview?.memberCount === 1 ? '' : 's'} · {preview?.dailyGoalMinutes} min/day goal
      </p>

      {status === 'error' && (
        <p role="alert" className="mt-3 text-sm text-rose-400">
          Couldn't join. Try again.
        </p>
      )}

      <div className="mt-5 flex justify-center gap-2">
        <button
          onClick={onCancel}
          disabled={status === 'joining'}
          className="rounded-md px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200"
        >
          Not now
        </button>
        <button
          onClick={handleJoin}
          disabled={status === 'joining'}
          className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {status === 'joining' ? 'Joining…' : 'Join Squad'}
        </button>
      </div>
    </div>
  );
}
