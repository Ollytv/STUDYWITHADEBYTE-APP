import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Loader2 } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Flashcard, FLASHCARD_LIMITS } from '../../types';
import {
  DEFAULT_EASE, MIN_NOTES_CHARS, MAX_NOTES_CHARS, normaliseDeckName, normaliseKey, todayISO,
} from '../../utils/flashcards';
import { generateFlashcards } from '../../services/flashcardAI';
import { generateId } from '../../utils/id';
import { inputStyle, labelClass } from './fieldStyles';

export interface NoteSource { id: string; title: string; courseCode: string; content: string }

interface Draft { key: string; front: string; back: string }

const COUNTS = [5, 10, 15, 20] as const;

/** Notes in → AI drafts → review/edit → save. Nothing is saved until the student confirms. */
export default function GenerateSheet({ decks, defaultDeck, notes, existing, onClose, onSave }: {
  decks: string[];
  defaultDeck: string;
  notes: NoteSource[];
  existing: Flashcard[];
  onClose: () => void;
  onSave: (cards: Flashcard[], skippedDuplicates: number) => void;
}) {
  const [step, setStep]       = useState<'input' | 'review'>('input');
  const [text, setText]       = useState('');
  const [deck, setDeck]       = useState(defaultDeck);
  const [count, setCount]     = useState<number>(10);
  const [noteId, setNoteId]   = useState('');
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const [drafts, setDrafts]   = useState<Draft[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  // Cancel any in-flight request if the sheet closes.
  useEffect(() => () => abortRef.current?.abort(), []);

  const pickNote = (id: string) => {
    setNoteId(id);
    setError('');
    const note = notes.find(n => n.id === id);
    if (!note) return;
    setText(note.content.slice(0, MAX_NOTES_CHARS));
    if (note.courseCode) setDeck(note.courseCode);
  };

  const generate = async () => {
    const trimmed = text.trim();
    if (trimmed.length < MIN_NOTES_CHARS) return setError(`Add a little more text — at least ${MIN_NOTES_CHARS} characters.`);

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError('');
    try {
      const result = await generateFlashcards(trimmed, count, controller.signal);
      if (controller.signal.aborted) return;
      setDrafts(result.map(c => ({ key: generateId(), ...c })));
      setStep('review');
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error && e.message ? e.message : 'Could not generate cards. Please try again.');
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };

  const updateDraft = (key: string, patch: Partial<Draft>) =>
    setDrafts(list => list.map(d => (d.key === key ? { ...d, ...patch } : d)));

  const keepable = drafts.filter(d => d.front.trim() && d.back.trim());

  const save = () => {
    const deckName = normaliseDeckName(deck);
    const seen = new Set(existing.filter(c => c.deck === deckName).map(c => normaliseKey(c.front)));
    const today = todayISO();
    const now = new Date().toISOString();
    const fresh: Flashcard[] = [];
    let skipped = 0;

    for (const d of keepable) {
      const key = normaliseKey(d.front);
      if (seen.has(key)) { skipped++; continue; }
      seen.add(key);
      fresh.push({
        id: generateId(), deck: deckName, front: d.front.trim(), back: d.back.trim(),
        dueDate: today, intervalDays: 0, ease: DEFAULT_EASE, reps: 0, lapses: 0, createdAt: now,
      });
    }
    onSave(fresh, skipped);
  };

  // ── Review step ──
  if (step === 'review') {
    return (
      <BottomSheet title="Review your cards" onClose={onClose}>
        <p className="text-xs text-content-secondary mb-4">
          AI can make mistakes — check each card against your notes. Edit or remove anything that's off.
        </p>
        <div className="space-y-3">
          {drafts.map(d => (
            <div key={d.key} className="rounded-2xl p-3"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
              <div className="flex items-start gap-2">
                <textarea rows={2} value={d.front} maxLength={FLASHCARD_LIMITS.front}
                  onChange={e => updateDraft(d.key, { front: e.target.value })} aria-label="Question"
                  className="flex-1 min-w-0 px-3 py-2 rounded-xl text-sm font-semibold focus:outline-none resize-none" style={inputStyle} />
                <button onClick={() => setDrafts(list => list.filter(x => x.key !== d.key))} aria-label="Remove card"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-content-muted flex-shrink-0 touch-manipulation">
                  <X size={15} />
                </button>
              </div>
              <textarea rows={2} value={d.back} maxLength={FLASHCARD_LIMITS.back}
                onChange={e => updateDraft(d.key, { back: e.target.value })} aria-label="Answer"
                className="w-full mt-2 px-3 py-2 rounded-xl text-sm focus:outline-none resize-none" style={inputStyle} />
            </div>
          ))}
          {drafts.length === 0 && <p className="text-sm text-content-secondary text-center py-6">All cards removed.</p>}
        </div>

        <div className="flex gap-3 mt-5">
          <button onClick={() => setStep('input')}
            className="px-5 py-3.5 rounded-2xl text-sm font-bold text-content-secondary touch-manipulation"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            Back
          </button>
          <button onClick={save} disabled={keepable.length === 0}
            className="flex-1 py-3.5 rounded-2xl text-sm font-black touch-manipulation disabled:opacity-40"
            style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
            Save {keepable.length} {keepable.length === 1 ? 'card' : 'cards'} to {normaliseDeckName(deck)}
          </button>
        </div>
      </BottomSheet>
    );
  }

  // ── Input step ──
  return (
    <BottomSheet title="Generate from notes" onClose={onClose}>
      <div className="space-y-5">
        {notes.length > 0 && (
          <div>
            <p className={labelClass}>Use a saved note</p>
            <select value={noteId} onChange={e => pickNote(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none" style={inputStyle} aria-label="Saved note">
              <option value="">Paste notes instead</option>
              {notes.map(n => <option key={n.id} value={n.id}>{n.courseCode ? `${n.courseCode} — ` : ''}{n.title}</option>)}
            </select>
          </div>
        )}

        <div>
          <p className={labelClass}>Your notes</p>
          <textarea rows={8} value={text} maxLength={MAX_NOTES_CHARS}
            onChange={e => { setText(e.target.value); setError(''); }}
            placeholder="Paste the notes you want to turn into flashcards…"
            className="w-full px-4 py-3 rounded-2xl text-sm focus:outline-none resize-none" style={inputStyle} aria-label="Notes" />
          <p className="text-[11px] text-content-muted text-right mt-1 tabular-nums">
            {text.length.toLocaleString()} / {MAX_NOTES_CHARS.toLocaleString()}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className={labelClass}>Deck</p>
            <input list="flashcard-deck-options-gen" value={deck} maxLength={FLASHCARD_LIMITS.deck}
              onChange={e => setDeck(e.target.value)} placeholder="e.g. BIO101"
              className="w-full px-3 py-3 rounded-2xl text-sm focus:outline-none" style={inputStyle} aria-label="Deck" />
            <datalist id="flashcard-deck-options-gen">{decks.map(d => <option key={d} value={d} />)}</datalist>
          </div>
          <div>
            <p className={labelClass}>Cards</p>
            <div className="flex gap-1.5">
              {COUNTS.map(n => (
                <button key={n} type="button" aria-pressed={count === n} onClick={() => setCount(n)}
                  className="flex-1 py-3 rounded-xl text-sm font-bold touch-manipulation"
                  style={{
                    background: count === n ? 'rgba(34,197,94,0.18)' : 'var(--bg-surface)',
                    border: `1px solid ${count === n ? '#22c55e' : 'var(--border-color)'}`,
                    color: 'var(--text-primary)',
                  }}>{n}</button>
              ))}
            </div>
          </div>
        </div>

        {error && <p role="alert" className="text-xs font-semibold" style={{ color: '#f87171' }}>{error}</p>}

        <button onClick={generate} disabled={busy}
          className="w-full py-3.5 rounded-2xl text-sm font-black flex items-center justify-center gap-2 touch-manipulation disabled:opacity-60"
          style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
          {busy ? <><Loader2 size={16} className="animate-spin" /> Writing your cards…</> : <><Sparkles size={16} /> Generate flashcards</>}
        </button>
      </div>
    </BottomSheet>
  );
}
