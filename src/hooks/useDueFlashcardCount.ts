import { useEffect, useState } from 'react';
import { isDue, todayISO } from '../utils/flashcards';
import * as db from '../services/db';

/** Number of flashcards due today — for the badge on the More page. Fails silently to 0. */
export function useDueFlashcardCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      unsub = db.listenToFlashcards(
        cards => { const today = todayISO(); setCount(cards.filter(c => isDue(c, today)).length); },
        () => setCount(0),
      );
    } catch {
      setCount(0);
    }
    return () => unsub?.();
  }, []);

  return count;
}
