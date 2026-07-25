// src/components/CreateSquadModal.tsx

import { useState, FormEvent } from 'react';
import { createSquad } from '../services/squadService';

interface CreateSquadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (squadId: string) => void;
}

export function CreateSquadModal({ isOpen, onClose, onCreated }: CreateSquadModalProps) {
  const [name, setName] = useState('');
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(10);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give your squad a name.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const squadId = await createSquad(name.trim(), dailyGoalMinutes);
      onCreated(squadId);
      setName('');
    } catch {
      setError('Could not create squad. Try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-squad-heading"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-xl bg-neutral-900 p-5 shadow-xl"
      >
        <h2 id="create-squad-heading" className="mb-4 text-lg font-semibold text-neutral-100">
          Start a Study Squad
        </h2>

        <label className="mb-3 block text-sm text-neutral-300">
          Squad name
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            required
            autoFocus
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
          />
        </label>

        <label className="mb-4 block text-sm text-neutral-300">
          Daily goal (minutes per member)
          <input
            type="number"
            min={5}
            max={120}
            step={5}
            value={dailyGoalMinutes}
            onChange={(e) => setDailyGoalMinutes(Number(e.target.value))}
            required
            className="mt-1 w-full rounded-md border border-neutral-700 bg-neutral-800 p-2 text-neutral-100"
          />
        </label>

        {error && (
          <p role="alert" className="mb-3 text-sm text-rose-400">{error}</p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-3 py-2 text-sm text-neutral-400 hover:text-neutral-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Create Squad'}
          </button>
        </div>
      </form>
    </div>
  );
}
