import { BookOpen, Target } from 'lucide-react';
import type { CourseClass } from '../../types';

interface SubjectGoalCardProps {
  classes: CourseClass[];
  selectedClassId: string | null;
  goal: string;
  onSelectClass: (classId: string | null) => void;
  onGoalChange: (goal: string) => void;
  disabled?: boolean;
}

export function SubjectGoalCard({
  classes,
  selectedClassId,
  goal,
  onSelectClass,
  onGoalChange,
  disabled = false,
}: SubjectGoalCardProps) {
  return (
    <div className="mx-4 mb-6 bg-dark-800 border border-white/5 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BookOpen size={14} className="text-green-400" />
        <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider">
          Studying
        </p>
      </div>

      <div className="mb-3">
        <label htmlFor="subject-select" className="sr-only">
          Active subject
        </label>
        <select
          id="subject-select"
          value={selectedClassId ?? ''}
          onChange={e => onSelectClass(e.target.value || null)}
          disabled={disabled}
          className="w-full bg-dark-950 border border-white/8 rounded-xl px-3 py-2.5 text-sm font-body text-white
                     focus:outline-none focus:ring-2 focus:ring-green-500/40 disabled:opacity-50"
        >
          <option value="">No subject selected</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>
              {c.courseName} ({c.courseCode})
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2 bg-dark-950 border border-white/8 rounded-xl px-3 py-2.5">
        <Target size={14} className="text-dark-500 shrink-0" />
        <label htmlFor="session-goal" className="sr-only">
          Session goal
        </label>
        <input
          id="session-goal"
          type="text"
          value={goal}
          onChange={e => onGoalChange(e.target.value)}
          disabled={disabled}
          placeholder="Session goal — e.g. Chapter 4, Integration Problems"
          maxLength={80}
          className="w-full bg-transparent text-sm font-body text-white placeholder:text-dark-500
                     focus:outline-none disabled:opacity-50"
        />
      </div>
    </div>
  );
}
