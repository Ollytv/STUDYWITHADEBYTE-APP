import type { Flashcard, FlashcardGrade, FlashcardStats } from '../types';
import { FLASHCARD_LIMITS } from '../types';

// ── Tunables ──────────────────────────────────────────────────────────────────

export const DEFAULT_EASE = 2.5;
export const MASTERED_INTERVAL_DAYS = 21;   // remembered across a 3-week gap
export const MAX_NEW_PER_SESSION = 20;
export const MAX_SESSION_CARDS = 100;
export const MAX_REQUEUES_PER_CARD = 3;     // a forgotten card returns at most 3× per session
export const MIN_NOTES_CHARS = 40;
export const MAX_NOTES_CHARS = 12_000;      // keeps the prompt well under the gateway's 32k limit

const MIN_EASE = 1.3;
const MAX_EASE = 3.0;
const MAX_INTERVAL_DAYS = 365;

// ── Dates (local calendar days, YYYY-MM-DD) ───────────────────────────────────

export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export const todayISO = (): string => toISODate(new Date());

export function addDaysISO(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
}

/** Whole days from `from` to `to` (negative if `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / 86_400_000);
}

// ── Scheduling ────────────────────────────────────────────────────────────────

export interface CardSchedule {
  dueDate: string;
  intervalDays: number;
  ease: number;
  reps: number;
  lapses: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Three-button spaced repetition (a simplified SM-2).
 *  - forgot: back to today, interval reset, ease drops, lapse counted
 *  - hard:   interval grows slowly (at least +1 day), ease drops slightly
 *  - easy:   interval grows fast, ease rises slightly
 * A card at interval 0 (new or just forgotten) goes to 1 day on "hard" and 3 days on "easy".
 */
export function scheduleCard(
  card: Pick<Flashcard, 'intervalDays' | 'ease' | 'reps' | 'lapses'>,
  grade: FlashcardGrade,
  today: string,
): CardSchedule {
  const prev = Math.max(0, Math.round(Number(card.intervalDays)) || 0);
  const ease = clamp(Number.isFinite(card.ease) ? card.ease : DEFAULT_EASE, MIN_EASE, MAX_EASE);

  if (grade === 'forgot') {
    return {
      dueDate: today,
      intervalDays: 0,
      ease: round2(clamp(ease - 0.2, MIN_EASE, MAX_EASE)),
      reps: 0,
      lapses: card.lapses + 1,
    };
  }

  let interval: number;
  let nextEase: number;
  if (grade === 'hard') {
    interval = prev === 0 ? 1 : Math.max(prev + 1, Math.round(prev * 1.2));
    nextEase = ease - 0.15;
  } else {
    interval = prev === 0 ? 3 : Math.max(prev + 1, Math.round(prev * ease * 1.3));
    nextEase = ease + 0.1;
  }
  interval = Math.min(interval, MAX_INTERVAL_DAYS);

  return {
    dueDate: addDaysISO(today, interval),
    intervalDays: interval,
    ease: round2(clamp(nextEase, MIN_EASE, MAX_EASE)),
    reps: card.reps + 1,
    lapses: card.lapses,
  };
}

/** Short label for a grade button, e.g. "Today", "3d", "2mo". */
export function intervalLabel(days: number): string {
  if (days <= 0) return 'Today';
  if (days < 30) return `${days}d`;
  if (days < 365) return `${Math.round(days / 30)}mo`;
  return '1y';
}

export function previewLabel(card: Flashcard, grade: FlashcardGrade, today: string): string {
  return intervalLabel(scheduleCard(card, grade, today).intervalDays);
}

// ── Card state ────────────────────────────────────────────────────────────────

export type CardStatus = 'new' | 'learning' | 'mastered';

export function cardStatus(card: Flashcard): CardStatus {
  if (!card.lastReviewedAt) return 'new';
  return card.intervalDays >= MASTERED_INTERVAL_DAYS ? 'mastered' : 'learning';
}

export const isDue = (card: Flashcard, today: string): boolean => card.dueDate <= today;

export function dueLabel(card: Flashcard, today: string): string {
  if (!card.lastReviewedAt) return 'New';
  if (isDue(card, today)) return 'Due today';
  return `Due in ${daysBetween(today, card.dueDate)}d`;
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Today's session: reviews first (most overdue first, shuffled within a day),
 * then up to MAX_NEW_PER_SESSION never-seen cards. Capped at MAX_SESSION_CARDS.
 */
export function buildQueue(cards: Flashcard[], today: string, rng: () => number = Math.random): string[] {
  const due = cards.filter(c => isDue(c, today));
  const reviews = shuffle(due.filter(c => c.lastReviewedAt), rng).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const fresh = shuffle(due.filter(c => !c.lastReviewedAt), rng).slice(0, MAX_NEW_PER_SESSION);
  return [...reviews, ...fresh].slice(0, MAX_SESSION_CARDS).map(c => c.id);
}

// ── Deck summaries ────────────────────────────────────────────────────────────

export interface DeckSummary {
  deck: string;
  total: number;
  due: number;
  fresh: number;
  learning: number;
  mastered: number;
}

export function groupDecks(cards: Flashcard[], today: string): DeckSummary[] {
  const map = new Map<string, DeckSummary>();
  for (const c of cards) {
    const s = map.get(c.deck) ?? { deck: c.deck, total: 0, due: 0, fresh: 0, learning: 0, mastered: 0 };
    s.total++;
    if (isDue(c, today)) s.due++;
    const status = cardStatus(c);
    if (status === 'new') s.fresh++;
    else if (status === 'mastered') s.mastered++;
    else s.learning++;
    map.set(c.deck, s);
  }
  return Array.from(map.values()).sort((a, b) => b.due - a.due || a.deck.localeCompare(b.deck));
}

// ── Streak ────────────────────────────────────────────────────────────────────

/** The streak to display: 0 once a full day has been missed. */
export function effectiveStreak(stats: FlashcardStats, today: string): number {
  if (stats.lastReviewDate === today || stats.lastReviewDate === addDaysISO(today, -1)) return stats.streak;
  return 0;
}

/** New stats after a review today, or null if today is already recorded (no write needed). */
export function nextStats(stats: FlashcardStats, today: string): FlashcardStats | null {
  if (stats.lastReviewDate === today) return null;
  const continues = stats.lastReviewDate === addDaysISO(today, -1);
  return { streak: continues ? stats.streak + 1 : 1, lastReviewDate: today };
}

// ── Text helpers ──────────────────────────────────────────────────────────────

export const normaliseKey = (s: string): string => s.trim().toLowerCase().replace(/\s+/g, ' ');

export function normaliseDeckName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').slice(0, FLASHCARD_LIMITS.deck) || 'General';
}

// ── AI generation ─────────────────────────────────────────────────────────────

export interface GeneratedCard { front: string; back: string }

export function buildGenerationPrompt(notes: string, count: number): string {
  return [
    `You are a flashcard writer for university students. From the NOTES below, write up to ${count} flashcards.`,
    '',
    'Rules:',
    `- Each card tests ONE fact, definition, concept or step. The front is a clear question or prompt (max ${FLASHCARD_LIMITS.front} characters). The back is a concise answer (max ${FLASHCARD_LIMITS.back} characters).`,
    '- Use only information found in the notes. Do not invent facts.',
    '- No duplicates and no numbering.',
    '- Respond with ONLY a JSON array — no markdown fences, no commentary — in exactly this shape:',
    '[{"front":"question","back":"answer"}]',
    '',
    'NOTES:',
    '"""',
    notes.trim(),
    '"""',
  ].join('\n');
}

/**
 * Turns the model's reply into validated cards. Tolerates code fences, preamble,
 * and a truncated array (complete objects are salvaged). Throws if nothing usable.
 */
export function parseGeneratedCards(text: string, max: number): GeneratedCard[] {
  const raw = text.replace(/```(?:json)?/gi, '');
  let items: unknown[] = [];

  const start = raw.indexOf('[');
  const end = raw.lastIndexOf(']');
  if (start !== -1 && end > start) {
    try {
      const parsed = JSON.parse(raw.slice(start, end + 1));
      if (Array.isArray(parsed)) items = parsed;
    } catch { /* fall through to object salvage */ }
  }

  if (items.length === 0) {
    for (const m of raw.match(/\{[^{}]*\}/g) ?? []) {
      try { items.push(JSON.parse(m)); } catch { /* skip malformed object */ }
    }
  }

  const seen = new Set<string>();
  const cards: GeneratedCard[] = [];
  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const { front, back } = item as Record<string, unknown>;
    if (typeof front !== 'string' || typeof back !== 'string') continue;
    const f = front.trim().slice(0, FLASHCARD_LIMITS.front);
    const b = back.trim().slice(0, FLASHCARD_LIMITS.back);
    const key = normaliseKey(f);
    if (!f || !b || seen.has(key)) continue;
    seen.add(key);
    cards.push({ front: f, back: b });
    if (cards.length >= max) break;
  }

  if (cards.length === 0) {
    throw new Error("Couldn't turn that into flashcards. Try more detailed notes, or fewer cards.");
  }
  return cards;
}
