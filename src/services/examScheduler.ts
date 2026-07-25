// src/services/examScheduler.ts
//
// Generates the DailyByte queue for an Exam: distributes each topic across
// the days remaining until examDate, weighting allocation by weakness
// (100 - masteryScore) so low-mastery topics get more daily bytes.
//
// Regeneration is idempotent and non-destructive: completed bytes (past or
// present) are never touched or removed. Only future, incomplete bytes are
// recomputed — call this again whenever masteryScore changes (after a quiz)
// or targetDailyMinutes/topics change.

import { Exam, DailyByte } from '../types';

const MIN_BYTE_MINUTES = 10;
const MAX_BYTE_MINUTES = 15;
const MIN_TOPIC_WEIGHT = 0.05; // floor so a mastered topic (100%) still gets occasional review

/** Inclusive day count from `from` (start of day) up to but excluding examDate. */
function daysUntilExam(examDate: string, from: Date = new Date()): number {
  const start = new Date(from.toISOString().split('T')[0]);
  const end = new Date(examDate);
  const msPerDay = 24 * 60 * 60 * 1000;
  const days = Math.round((end.getTime() - start.getTime()) / msPerDay);
  return Math.max(days, 0);
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/** Weight = inverse mastery, floored so every topic keeps getting scheduled. */
function topicWeight(masteryScore: number): number {
  return Math.max((100 - masteryScore) / 100, MIN_TOPIC_WEIGHT);
}

export interface GenerateOptions {
  /** Existing bytes for this exam — completed ones are preserved untouched. */
  existingBytes: DailyByte[];
  /** Injected for deterministic tests; defaults to real "today". */
  now?: Date;
  /** ID factory — defaults to crypto.randomUUID, injectable for tests. */
  idFactory?: () => string;
}

/**
 * Regenerates the future (incomplete) portion of an exam's DailyByte queue.
 * Returns the FULL byte list for the exam (past completed + newly generated),
 * ready to be diffed/written by the caller (e.g. batched Firestore writes for
 * only the ids not already present).
 */
export function generateDailyBytes(exam: Exam, options: GenerateOptions): DailyByte[] {
  const { existingBytes, now = new Date(), idFactory = () => crypto.randomUUID() } = options;

  const todayISO = toISODate(now);

  // Keep every completed byte, and every past-dated byte, untouched.
  const preserved = existingBytes.filter(b => b.completed || b.date < todayISO);

  const remainingDays = daysUntilExam(exam.examDate, now);
  if (remainingDays <= 0 || exam.topics.length === 0) {
    return preserved;
  }

  // Remaining minutes owed per topic = weight share of (days * targetDailyMinutes),
  // minus minutes already covered by preserved bytes for that topic.
  const totalWeight = exam.topics.reduce((sum, t) => sum + topicWeight(t.masteryScore), 0);
  const totalBudgetMinutes = remainingDays * exam.targetDailyMinutes;

  const minutesOwed = new Map<string, number>();
  exam.topics.forEach(topic => {
    const share = (topicWeight(topic.masteryScore) / totalWeight) * totalBudgetMinutes;
    const alreadyCovered = preserved
      .filter(b => b.topicId === topic.id)
      .reduce((sum, b) => sum + b.durationMinutes, 0);
    minutesOwed.set(topic.id, Math.max(share - alreadyCovered, 0));
  });

  const generated: DailyByte[] = [];

  for (let dayOffset = 0; dayOffset < remainingDays; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dateISO = toISODate(date);

    // Skip a day that already has any preserved byte (avoid double-scheduling
    // a day the user already has bytes for, e.g. after a partial regeneration).
    if (preserved.some(b => b.date === dateISO)) continue;

    let minutesLeftToday = exam.targetDailyMinutes;

    // Each day, spend on the topic(s) with the most minutes still owed —
    // greedy by largest remaining debt, capped to byte-sized chunks.
    while (minutesLeftToday >= MIN_BYTE_MINUTES) {
      const [topicId, owed] = [...minutesOwed.entries()]
        .filter(([, m]) => m > 0)
        .sort((a, b) => b[1] - a[1])[0] ?? [];

      if (!topicId) break; // all topics fully covered

      const duration = Math.min(MAX_BYTE_MINUTES, minutesLeftToday, Math.max(owed, MIN_BYTE_MINUTES));

      generated.push({
        id: idFactory(),
        examId: exam.id,
        topicId,
        date: dateISO,
        durationMinutes: duration,
        completed: false,
      });

      minutesOwed.set(topicId, Math.max(owed - duration, 0));
      minutesLeftToday -= duration;
    }
  }

  return [...preserved, ...generated];
}

/**
 * Convenience: returns only today's bytes for the home-screen "Today's Bytes"
 * view. Does not trigger regeneration — call generateDailyBytes first if the
 * schedule may be stale (e.g. after a quiz score update).
 */
export function getTodaysBytes(allBytes: DailyByte[], now: Date = new Date()): DailyByte[] {
  const todayISO = toISODate(now);
  return allBytes.filter(b => b.date === todayISO);
}
