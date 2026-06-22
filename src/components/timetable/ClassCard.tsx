import { motion } from 'framer-motion';
import { Clock, MapPin, User, Pencil, Trash2, MoreVertical } from 'lucide-react';
import { useState } from 'react';
import { CourseClass } from '../../types';
import { getColorClasses } from '../../utils/colors';
import { formatTimeRange, isClassNow, isClassSoon, isClassPast } from '../../utils/time';
import { AttendanceBadge } from '../ui/Badge';

interface ClassCardProps {
  cls: CourseClass;
  onEdit?: (cls: CourseClass) => void;
  onDelete?: (id: string) => void;
  onMarkAttendance?: (classId: string, attended: boolean) => void;
  showDate?: boolean;
  index?: number;
}

export function ClassCard({ cls, onEdit, onDelete, onMarkAttendance, showDate = false, index = 0 }: ClassCardProps) {
  const colors = getColorClasses(cls.colorLabel);
  const [showMenu, setShowMenu] = useState(false);

  const isNow = isClassNow(cls.startTime, cls.endTime);
  const isSoon = isClassSoon(cls.startTime);
  const isPast = isClassPast(cls.endTime);

  return (
    <motion.div
      className={`
        relative rounded-2xl border overflow-hidden
        ${isNow ? 'border-green-500/40 bg-green-500/5' : 'border-white/5 bg-dark-800'}
        transition-all duration-200
      `}
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
    >
      {/* Left color strip */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${colors.dot}`} />

      <div className="pl-4 pr-4 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Status pill */}
            {isNow && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-xs font-body font-semibold text-green-400 uppercase tracking-wider">Ongoing</span>
              </div>
            )}
            {isSoon && !isNow && (
              <div className="flex items-center gap-1.5 mb-2">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-xs font-body font-semibold text-yellow-400 uppercase tracking-wider">Starting soon</span>
              </div>
            )}

            {/* Course name & code */}
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-display font-semibold text-sm leading-tight ${isPast ? 'text-dark-300' : 'text-white'}`}>
                {cls.courseName}
              </h3>
            </div>
            <span className={`text-xs font-mono px-2 py-0.5 rounded-md ${colors.bg} ${colors.text}`}>
              {cls.courseCode}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <AttendanceBadge percentage={cls.attendancePercentage} />
            <div className="relative">
              <button
                onClick={() => setShowMenu(v => !v)}
                className="p-2 rounded-xl hover:bg-white/8 transition-colors text-dark-400 hover:text-white"
              >
                <MoreVertical size={16} />
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 top-8 z-20 bg-dark-800 border border-white/10 rounded-2xl shadow-card overflow-hidden min-w-[140px]">
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(cls); setShowMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-dark-200 hover:bg-white/5 hover:text-white transition-colors"
                      >
                        <Pencil size={14} />
                        Edit
                      </button>
                    )}
                    {onMarkAttendance && (
                      <>
                        <button
                          onClick={() => { onMarkAttendance(cls.id, true); setShowMenu(false); }}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-green-400 hover:bg-green-500/10 transition-colors"
                        >
                          ✓ Attended
                        </button>
                        <button
                          onClick={() => { onMarkAttendance(cls.id, false); setShowMenu(false); }}
                          className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                        >
                          ✗ Missed
                        </button>
                      </>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(cls.id); setShowMenu(false); }}
                        className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors border-t border-white/5"
                      >
                        <Trash2 size={14} />
                        Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Details */}
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-dark-400 font-body">
            <Clock size={12} className="shrink-0" />
            <span>{formatTimeRange(cls.startTime, cls.endTime)}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-dark-400 font-body">
            <MapPin size={12} className="shrink-0" />
            <span>{cls.venue}</span>
          </div>
          {cls.lecturer && cls.lecturer !== 'TBD' && (
            <div className="flex items-center gap-2 text-xs text-dark-400 font-body">
              <User size={12} className="shrink-0" />
              <span>{cls.lecturer}</span>
            </div>
          )}
        </div>

        {/* Attendance bar */}
        <div className="mt-3 pt-3 border-t border-white/5">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-dark-500 font-body">{cls.totalClassesAttended}/{cls.totalClassesHeld} classes</span>
            <span className="text-dark-500 font-body">{cls.attendancePercentage}% attendance</span>
          </div>
          <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                cls.attendancePercentage >= 75 ? 'bg-green-500'
                : cls.attendancePercentage >= 50 ? 'bg-yellow-500'
                : 'bg-red-500'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${cls.attendancePercentage}%` }}
              transition={{ duration: 0.6, ease: 'easeOut', delay: index * 0.05 }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
