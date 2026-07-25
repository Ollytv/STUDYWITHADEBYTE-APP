// src/services/examMastery.ts
//
// Updates an ExamTopic's masteryScore from a new QuizAttempt, then
// regenerates the exam's future DailyBytes so the scheduler immediately
// reflects the new weighting. Call this right after a quiz submission.

import { Exam, ExamTopic, QuizAttempt, DailyByte } from '../types';
import { generateDailyBytes } from './examScheduler';

const RECENCY_WEIGHT = 0.6; // new attempt's influence vs. rolling average

/**
 * Blends the new score into the topic's rolling mastery rather than
 * overwriting it — a single lucky/unlucky quiz shouldn't swing the whole
 * schedule. RECENCY_WEIGHT controls how much the latest attempt matters.
 */
function blendMastery(currentMastery: number, newScore: number): number {
  const blended = currentMastery * (1 - RECENCY_WEIGHT) + newScore * RECENCY_WEIGHT;
  return Math.round(Math.min(Math.max(blended, 0), 100));
}

export interface RecordQuizResult {
  updatedExam: Exam;
  updatedBytes: DailyByte[];
}

/**
 * Records a quiz attempt against a topic, updates its masteryScore, and
 * regenerates the exam's DailyByte queue. Returns both the updated Exam
 * (for persisting topics[].masteryScore) and the full DailyByte list
 * (for diffing/writing — see generateDailyBytes for preserve semantics).
 *
 * Caller is responsible for persisting `attempt` itself (e.g. appending to
 * a quizAttempts subcollection) — this function only handles the
 * derived mastery + schedule state.
 */
export function recordQuizAttempt(
  exam: Exam,
  attempt: QuizAttempt,
  existingBytes: DailyByte[],
  now: Date = new Date()
): RecordQuizResult {
  const topicIndex = exam.topics.findIndex(t => t.id === attempt.topicId);
  if (topicIndex === -1) {
    throw new Error(`Topic ${attempt.topicId} not found on exam ${exam.id}`);
  }

  const topic = exam.topics[topicIndex];
  const updatedTopic: ExamTopic = {
    ...topic,
    masteryScore: blendMastery(topic.masteryScore, attempt.score),
    lastStudiedAt: attempt.takenAt,
  };

  const updatedTopics = [...exam.topics];
  updatedTopics[topicIndex] = updatedTopic;

  const updatedExam: Exam = {
    ...exam,
    topics: updatedTopics,
    updatedAt: now.toISOString(),
  };

  const updatedBytes = generateDailyBytes(updatedExam, { existingBytes, now });

  return { updatedExam, updatedBytes };
}

/** Exam-wide readiness % for the Syllabus Progress Bar — simple topic average. */
export function getExamReadiness(exam: Exam): number {
  if (exam.topics.length === 0) return 0;
  const total = exam.topics.reduce((sum, t) => sum + t.masteryScore, 0);
  return Math.round(total / exam.topics.length);
}
