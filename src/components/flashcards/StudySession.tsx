import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { Flashcard, FlashcardGrade } from '../../types';
import { MAX_REQUEUES_PER_CARD, previewLabel, todayISO } from '../../utils/flashcards';

const GRADES: { grade: FlashcardGrade; label: string; color: string; key: string }[] = [
  { grade: 'forgot', label: 'Forgot', color: '#f87171', key: '1' },
  { grade: 'hard',   label: 'Hard',   color: '#fbbf24', key: '2' },
  { grade: 'easy',   label: 'Easy',   color: '#22c55e', key: '3' },
];

const face = {
  backfaceVisibility: 'hidden',
  WebkitBackfaceVisibility: 'hidden',
  borderRadius: 24,
  border: '1px solid var(--border-color)',
  boxShadow: 'var(--shadow-card-hover)',
} as const;

/** Flip-card review. Grades are applied through onGrade; forgotten cards return to the end of the queue. */
export default function StudySession({ cards, queueIds, streak, onGrade, onExit }: {
  cards: Flashcard[];
  queueIds: string[];
  streak: number;
  onGrade: (card: Flashcard, grade: FlashcardGrade) => void;
  onExit: () => void;
}) {
  const reduceMotion = useReducedMotion();
  const byId = useMemo(() => new Map(cards.map(c => [c.id, c])), [cards]);

  const [queue, setQueue]       = useState<string[]>(() => queueIds.filter(id => byId.has(id)));
  const [index, setIndex]       = useState(0);
  const [flipped, setFlipped]   = useState(false);
  const [done, setDone]         = useState(false);
  const [counts, setCounts]     = useState({ forgot: 0, hard: 0, easy: 0 });
  const [requeues, setRequeues] = useState<Record<string, number>>({});

  const current = byId.get(queue[index]);
  const today = todayISO();

  // A card deleted elsewhere mid-session is skipped.
  useEffect(() => {
    if (done || current) return;
    if (index + 1 >= queue.length) setDone(true); else setIndex(i => i + 1);
  }, [done, current, index, queue.length]);

  const grade = useCallback((g: FlashcardGrade) => {
    if (!current || !flipped) return;
    onGrade(current, g);
    setCounts(c => ({ ...c, [g]: c[g] + 1 }));

    let nextQueue = queue;
    if (g === 'forgot' && (requeues[current.id] ?? 0) < MAX_REQUEUES_PER_CARD) {
      nextQueue = [...queue, current.id];
      setQueue(nextQueue);
      setRequeues(r => ({ ...r, [current.id]: (r[current.id] ?? 0) + 1 }));
    }
    setFlipped(false);
    if (index + 1 >= nextQueue.length) setDone(true); else setIndex(index + 1);
  }, [current, flipped, index, queue, requeues, onGrade]);

  // Keyboard: Space/Enter flips, 1/2/3 grades.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (done) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(true); }
      else if (e.key === 'Escape') onExit();
      else {
        const g = GRADES.find(x => x.key === e.key);
        if (g) grade(g.grade);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [done, grade, onExit]);

  // ── Summary ──
  if (done) {
    const total = counts.forgot + counts.hard + counts.easy;
    return (
      <div className="min-h-screen bg-surface-base flex flex-col items-center justify-center px-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <p className="text-6xl mb-3" aria-hidden="true">{total > 0 ? '🎉' : '👍'}</p>
          <h1 className="text-2xl font-black text-content-primary" style={{ fontFamily: 'Georgia, serif' }}>
            {total > 0 ? 'Session complete' : 'Nothing to review'}
          </h1>
          {total > 0 && <p className="text-sm text-content-secondary mt-1">{total} {total === 1 ? 'review' : 'reviews'} done</p>}
        </motion.div>

        {total > 0 && (
          <div className="grid grid-cols-3 gap-3 w-full max-w-xs mt-6">
            {GRADES.map(g => (
              <div key={g.grade} className="rounded-2xl py-3"
                style={{ background: `${g.color}1f`, border: `1px solid ${g.color}55` }}>
                <p className="text-2xl font-black text-content-primary tabular-nums">{counts[g.grade]}</p>
                <p className="text-[11px] font-bold text-content-secondary">{g.label}</p>
              </div>
            ))}
          </div>
        )}

        {streak > 0 && (
          <p className="text-sm font-bold text-content-primary mt-6">
            <span aria-hidden="true">🔥</span> {streak}-day streak
          </p>
        )}

        <button onClick={onExit} autoFocus
          className="mt-8 w-full max-w-xs py-3.5 rounded-2xl text-sm font-black touch-manipulation"
          style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
          Done
        </button>
      </div>
    );
  }

  if (!current) return null;

  const progress = (index / Math.max(queue.length, 1)) * 100;

  return (
    <div className="min-h-screen bg-surface-base flex flex-col">
      {/* Top bar */}
      <div className="px-5 pt-14 pb-3">
        <div className="flex items-center gap-3 mb-3">
          <button onClick={onExit} aria-label="End session"
            className="w-10 h-10 rounded-2xl flex items-center justify-center text-content-secondary touch-manipulation"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <X size={18} />
          </button>
          <p className="flex-1 text-sm font-bold text-content-primary tabular-nums" aria-live="polite">
            Card {index + 1} of {queue.length}
          </p>
          <span className="text-xs font-bold text-content-muted truncate max-w-[40%]">{current.deck}</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--border-strong)' }}
          role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-label="Session progress">
          <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#22c55e', transition: 'width 0.3s' }} />
        </div>
      </div>

      {/* Card */}
      <div className="flex-1 px-5 pt-4 pb-4 flex flex-col justify-center">
        <div style={{ perspective: 1400 }}>
          <motion.div key={`${index}-${current.id}`}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 16 }}
            animate={{ opacity: 1, y: 0, rotateY: flipped ? 180 : 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.45, ease: 'easeInOut' }}
            style={{ transformStyle: 'preserve-3d', position: 'relative', height: 'min(52dvh, 400px)' }}>

            <button type="button" onClick={() => setFlipped(true)} disabled={flipped}
              aria-hidden={flipped} tabIndex={flipped ? -1 : 0}
              className="absolute inset-0 w-full p-6 flex flex-col text-left touch-manipulation"
              style={{ ...face, background: 'var(--bg-surface)' }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-content-muted mb-3">Question</span>
              <span className="flex-1 overflow-y-auto flex items-center justify-center text-center text-xl font-bold text-content-primary whitespace-pre-wrap leading-snug"
                style={{ fontFamily: 'Georgia, serif' }}>{current.front}</span>
              <span className="text-xs text-content-muted text-center mt-3">Tap to reveal the answer</span>
            </button>

            <div aria-hidden={!flipped}
              className="absolute inset-0 p-6 flex flex-col"
              style={{
                ...face, transform: 'rotateY(180deg)',
                backgroundColor: 'var(--bg-surface)',
                backgroundImage: 'linear-gradient(135deg, rgba(34,197,94,0.14), rgba(5,150,105,0.06))',
                borderColor: 'rgba(34,197,94,0.3)',
              }}>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-500 mb-3">Answer</span>
              <span className="flex-1 overflow-y-auto flex items-center justify-center text-center text-lg font-semibold text-content-primary whitespace-pre-wrap leading-relaxed">
                {current.back}
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Actions */}
      <div className="px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 20px)' }}>
        {flipped ? (
          <div className="grid grid-cols-3 gap-3">
            {GRADES.map(g => (
              <button key={g.grade} onClick={() => grade(g.grade)}
                className="rounded-2xl py-3 touch-manipulation flex flex-col items-center gap-0.5"
                style={{ background: `${g.color}1f`, border: `1px solid ${g.color}66` }}>
                <span className="text-sm font-black text-content-primary">{g.label}</span>
                <span className="text-[11px] font-semibold text-content-secondary">{previewLabel(current, g.grade, today)}</span>
              </button>
            ))}
          </div>
        ) : (
          <button onClick={() => setFlipped(true)}
            className="w-full py-3.5 rounded-2xl text-sm font-black touch-manipulation"
            style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000' }}>
            Show answer
          </button>
        )}
        <p className="hidden sm:block text-[11px] text-content-muted text-center mt-3">
          Space flips · 1 Forgot · 2 Hard · 3 Easy
        </p>
      </div>
    </div>
  );
}
