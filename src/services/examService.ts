// src/services/examService.ts

import {
  doc, collection, writeBatch, getDocs, query, where,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { Exam, ExamTopic, QuizAttempt, DailyByte } from '../types';
import { generateDailyBytes } from './examScheduler';
import { recordQuizAttempt } from './examMastery';

function examsRef(uid: string) {
  return collection(db, 'users', uid, 'exams');
}
function dailyBytesRef(uid: string) {
  return collection(db, 'users', uid, 'dailyBytes');
}
function quizAttemptsRef(uid: string) {
  return collection(db, 'users', uid, 'quizAttempts');
}

export interface CreateExamInput {
  courseCode: string;
  courseName: string;
  examDate: string;
  targetDailyMinutes: number;
  topicNames: string[];
  semester: Exam['semester'];
  academicYear: string;
}

/** Creates an Exam, generates its initial DailyByte queue, and writes both in one batch. */
export async function createExam(input: CreateExamInput): Promise<Exam> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in.');

  const now = new Date().toISOString();
  const examRef = doc(examsRef(user.uid));

  const topics: ExamTopic[] = input.topicNames.map((name) => ({
    id: crypto.randomUUID(),
    name,
    masteryScore: 0,
    totalMinutesStudied: 0,
  }));

  const exam: Exam = {
    id: examRef.id,
    courseCode: input.courseCode,
    courseName: input.courseName,
    examDate: input.examDate,
    targetDailyMinutes: input.targetDailyMinutes,
    topics,
    semester: input.semester,
    academicYear: input.academicYear,
    createdAt: now,
    updatedAt: now,
  };

  const bytes = generateDailyBytes(exam, { existingBytes: [] });

  const batch = writeBatch(db);
  batch.set(examRef, exam);
  bytes.forEach((byte) => {
    batch.set(doc(dailyBytesRef(user.uid), byte.id), byte);
  });
  await batch.commit();

  return exam;
}

/** Toggles a DailyByte's completed state. Triggers onByteCompleted Cloud
 * Function server-side for squad streak validation — no client squad writes. */
export async function setByteCompleted(byteId: string, completed: boolean): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in.');

  const batch = writeBatch(db);
  batch.update(doc(dailyBytesRef(user.uid), byteId), {
    completed,
    completedAt: completed ? new Date().toISOString() : null,
  });
  await batch.commit();
}

/**
 * Submits a quiz attempt: persists the attempt, updates the topic's mastery
 * score, and regenerates + writes the exam's future DailyByte queue.
 * Only new bytes are written — preserved (completed/past) bytes are skipped
 * since generateDailyBytes returns them unchanged with their existing ids.
 */
export async function submitQuizAttempt(
  exam: Exam,
  topicId: string,
  score: number
): Promise<{ updatedExam: Exam; newBytes: DailyByte[] }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Must be signed in.');

  const attempt: QuizAttempt = {
    id: doc(quizAttemptsRef(user.uid)).id,
    examId: exam.id,
    topicId,
    score,
    takenAt: new Date().toISOString(),
  };

  const existingBytesSnap = await getDocs(
    query(dailyBytesRef(user.uid), where('examId', '==', exam.id))
  );
  const existingBytes = existingBytesSnap.docs.map((d) => d.data() as DailyByte);
  const existingIds = new Set(existingBytes.map((b) => b.id));

  const { updatedExam, updatedBytes } = recordQuizAttempt(exam, attempt, existingBytes);
  const newBytes = updatedBytes.filter((b) => !existingIds.has(b.id));

  const batch = writeBatch(db);
  batch.set(doc(quizAttemptsRef(user.uid), attempt.id), attempt);
  batch.update(doc(examsRef(user.uid), exam.id), {
    topics: updatedExam.topics,
    updatedAt: updatedExam.updatedAt,
  });
  newBytes.forEach((byte) => {
    batch.set(doc(dailyBytesRef(user.uid), byte.id), byte);
  });
  await batch.commit();

  return { updatedExam, newBytes };
}
