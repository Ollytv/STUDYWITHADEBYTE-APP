import { useCallback, useEffect, useRef, useState } from 'react';
import { Flashcard, FlashcardGrade, FlashcardStats, DEFAULT_FLASHCARD_STATS } from '../types';
import { scheduleCard, nextStats, todayISO } from '../utils/flashcards';
import * as db from '../services/db';

/**
 * Smart Flashcards data hook. Subscribes on mount / unsubscribes on unmount, so it
 * adds nothing to the global store or auth flow. Writes are not awaited by callers
 * for server acknowledgement — Firestore's local cache updates the listeners
 * immediately, which keeps review sessions instant on weak connections.
 */
export function useFlashcards() {
  const [cards, setCards]     = useState<Flashcard[]>([]);
  const [stats, setStats]     = useState<FlashcardStats>(DEFAULT_FLASHCARD_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [attempt, setAttempt] = useState(0);

  // Latest stats, readable synchronously — rapid grading must not act on a stale render.
  const statsRef = useRef<FlashcardStats>(DEFAULT_FLASHCARD_STATS);

  useEffect(() => {
    setLoading(true);
    setError('');

    let cardsReady = false;
    let statsReady = false;
    const markReady = () => { if (cardsReady && statsReady) setLoading(false); };
    const fail = (e: unknown) => { setError(db.getFriendlyError(e)); setLoading(false); };

    const unsubs: Array<() => void> = [];
    try {
      unsubs.push(db.listenToFlashcards(list => {
        setCards(list);
        cardsReady = true;
        markReady();
      }, fail));
      unsubs.push(db.listenToFlashcardStats(s => {
        statsRef.current = s;
        setStats(s);
        statsReady = true;
        markReady();
      }, fail));
    } catch (e) {
      fail(e);
    }

    return () => unsubs.forEach(u => u());
  }, [attempt]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);

  /** Applies the review result to the card and records today's streak (at most one write per day). */
  const gradeCard = useCallback((card: Flashcard, grade: FlashcardGrade): Promise<void> => {
    const today = todayISO();
    const updated: Flashcard = {
      ...card,
      ...scheduleCard(card, grade, today),
      lastReviewedAt: new Date().toISOString(),
    };

    const streakUpdate = nextStats(statsRef.current, today);
    if (streakUpdate) {
      statsRef.current = streakUpdate;
      setStats(streakUpdate);
      // Streak is cosmetic — a failed write must not block or fail the review itself.
      db.saveFlashcardStats(streakUpdate).catch(() => { /* listener restores the stored value */ });
    }

    return db.saveFlashcard(updated);
  }, []);

  const saveCard   = useCallback((c: Flashcard) => db.saveFlashcard(c), []);
  const saveCards  = useCallback((list: Flashcard[]) => db.saveFlashcards(list), []);
  const removeCard = useCallback((id: string) => db.deleteFlashcard(id), []);
  const removeMany = useCallback((ids: string[]) => db.deleteFlashcards(ids), []);

  return { cards, stats, loading, error, retry, gradeCard, saveCard, saveCards, removeCard, removeMany };
}
