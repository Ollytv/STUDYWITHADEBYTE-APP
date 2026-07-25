// src/components/TodaysBytes.tsx

import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { DailyByte, Exam } from '../types';

interface TodaysBytesProps {
  bytes: DailyByte[];
  exams: Exam[];
  loading?: boolean;
  onToggleComplete: (byteId: string, completed: boolean) => void;
}

function topicName(exams: Exam[], examId: string, topicId: string): string {
  const exam = exams.find((e) => e.id === examId);
  return exam?.topics.find((t) => t.id === topicId)?.name ?? 'Topic';
}

function examLabel(exams: Exam[], examId: string): string {
  return exams.find((e) => e.id === examId)?.courseCode ?? '';
}

export function TodaysBytes({ bytes, exams, loading, onToggleComplete }: TodaysBytesProps) {
  const sorted = useMemo(
    () => [...bytes].sort((a, b) => Number(a.completed) - Number(b.completed)),
    [bytes]
  );

  if (loading) {
    return (
      <div className="px-5 mb-5" role="status" aria-live="polite">
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)' }} />
          ))}
        </div>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="px-5 mb-5">
        <div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}>
          <div className="text-3xl mb-2">📚</div>
          <p className="text-sm text-dark-400">No bytes scheduled for today — add an exam to generate your study plan.</p>
        </div>
      </div>
    );
  }

  const completedCount = sorted.filter((b) => b.completed).length;

  return (
    <div className="px-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>
          Today's Bytes
        </h2>
        <span className="text-xs text-dark-500" aria-live="polite">{completedCount}/{sorted.length} done</span>
      </div>

      <div className="space-y-2.5">
        <AnimatePresence initial={false}>
          {sorted.map((byte, i) => (
            <motion.label
              key={byte.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * i, type: 'spring', stiffness: 300 }}
              className="flex items-center gap-3 rounded-2xl p-3.5 touch-manipulation cursor-pointer"
              style={{
                background: byte.completed ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${byte.completed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
              }}
            >
              <input
                type="checkbox"
                checked={byte.completed}
                onChange={(e) => onToggleComplete(byte.id, e.target.checked)}
                className="sr-only"
                aria-label={`Mark ${topicName(exams, byte.examId, byte.topicId)} as ${byte.completed ? 'incomplete' : 'complete'}`}
              />
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{
                  background: byte.completed ? '#22c55e' : 'transparent',
                  border: byte.completed ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
                }}
              >
                {byte.completed && <Check size={14} strokeWidth={3} className="text-dark-950" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-bold truncate ${byte.completed ? 'text-dark-500 line-through' : 'text-white'}`}>
                  {topicName(exams, byte.examId, byte.topicId)}
                </p>
                <p className="text-xs text-dark-500">
                  {examLabel(exams, byte.examId)} · {byte.durationMinutes} min
                </p>
              </div>
            </motion.label>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
