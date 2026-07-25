// src/components/SyllabusProgressBar.tsx

import { motion } from 'framer-motion';
import { Exam } from '../types';
import { getExamReadiness } from '../services/examMastery';

interface SyllabusProgressBarProps {
  exam: Exam;
}

function readinessColor(pct: number): string {
  if (pct >= 80) return '#22c55e';
  if (pct >= 50) return '#fbbf24';
  return '#f87171';
}

export function SyllabusProgressBar({ exam }: SyllabusProgressBarProps) {
  const readiness = getExamReadiness(exam);
  const color = readinessColor(readiness);

  return (
    <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-bold text-white">{exam.courseCode}</p>
        <p className="text-xs font-bold" style={{ color }}>{readiness}% Exam Ready</p>
      </div>
      <div
        role="progressbar"
        aria-valuenow={readiness}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${exam.courseCode} exam readiness`}
        className="h-2 w-full rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.08)' }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${readiness}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>
    </div>
  );
}
