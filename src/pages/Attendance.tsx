import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, BarChart2, Shield } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useStore } from '../hooks/useStore';
import { ProgressRing } from '../components/ui/ProgressRing';
import { AttendanceBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { SemesterSwitcher } from '../components/ui/SemesterSwitcher';
import { getColorClasses } from '../utils/colors';
import { getDayOrder } from '../utils/time';

type Filter = 'all' | 'good' | 'warning' | 'danger';
const DAYS = getDayOrder();

export default function Attendance() {
  const { classes, markAttendance, attendance, activeSemester, activeAcademicYear } = useStore();
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView]     = useState<'courses' | 'weekly'>('courses');
  // Track which class is currently being marked to show loading state
  const [marking, setMarking] = useState<string | null>(null);

  const handleMark = async (classId: string, attended: boolean) => {
    if (marking) return; // prevent double-tap
    setMarking(`${classId}-${attended}`);
    try {
      await markAttendance(classId, attended);
    } finally {
      setMarking(null);
    }
  };

  const semClasses = useMemo(() =>
    classes.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear),
    [classes, activeSemester, activeAcademicYear]);

  const filteredClasses = useMemo(() => semClasses.filter(c => {
    if (filter === 'good')    return c.attendancePercentage >= 75;
    if (filter === 'warning') return c.attendancePercentage >= 50 && c.attendancePercentage < 75;
    if (filter === 'danger')  return c.attendancePercentage < 50;
    return true;
  }), [semClasses, filter]);

  const stats = useMemo(() => {
    const good    = semClasses.filter(c => c.attendancePercentage >= 75).length;
    const warning = semClasses.filter(c => c.attendancePercentage >= 50 && c.attendancePercentage < 75).length;
    const danger  = semClasses.filter(c => c.attendancePercentage < 50 && c.totalClassesHeld > 0).length;
    const totalAttended = semClasses.reduce((s, c) => s + c.totalClassesAttended, 0);
    const totalHeld     = semClasses.reduce((s, c) => s + c.totalClassesHeld, 0);
    const overall = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;
    return { total: semClasses.length, good, warning, danger, totalAttended, totalHeld, overall };
  }, [semClasses]);

  const weeklyStats = useMemo(() => DAYS.map(day => {
    const dayClasses = semClasses.filter(c => c.day === day);
    const held     = dayClasses.reduce((s, c) => s + c.totalClassesHeld, 0);
    const attended = dayClasses.reduce((s, c) => s + c.totalClassesAttended, 0);
    return { day, held, attended, pct: held > 0 ? Math.round((attended / held) * 100) : 0, count: dayClasses.length };
  }), [semClasses]);

  const ringColor = stats.overall >= 75 ? '#22c55e' : stats.overall >= 50 ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-screen bg-dark-950 pb-28">

      {/* ── STICKY HEADER ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'rgba(10,10,15,0.92)' }}>
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(34,197,94,0.12) 0%, rgba(5,150,105,0.06) 40%, transparent 70%)' }} />
        <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.1) 0%, transparent 70%)' }} />
        <div className="relative px-5 pt-14 pb-4">
          <motion.div className="flex items-center gap-2 mb-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Shield size={13} className="text-green-400" />
            <span className="text-[10px] font-black text-green-400/80 uppercase tracking-widest">Track Record</span>
          </motion.div>
          <motion.h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            Attendance
          </motion.h1>
          <motion.p className="text-xs text-dark-400 mt-0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Track your class presence this semester
          </motion.p>
        </div>
      </div>

      <SemesterSwitcher />
      </div>

      {/* ── SUMMARY HERO ────────────────────────────────────────────────── */}
      <motion.div className="mx-5 mb-5 rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #0f1f10, #1a2e1a)', border: '1px solid rgba(34,197,94,0.25)' }}
        initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, type: 'spring', stiffness: 280 }}>

        {/* Decorative glow */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent)' }} />

        <div className="p-5">
          <div className="flex items-center gap-5">
            <div className="relative">
              <ProgressRing percentage={stats.overall} size={88} strokeWidth={7} color={ringColor}>
                <div className="text-center">
                  <p className="text-xl font-black text-white leading-none" style={{ fontFamily: 'Georgia, serif' }}>{stats.overall}%</p>
                </div>
              </ProgressRing>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-green-400/70 uppercase tracking-widest mb-1">Semester Average</p>
              <p className="text-4xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-1.5px' }}>
                {stats.overall}<span className="text-xl" style={{ color: ringColor }}> %</span>
              </p>
              <p className="text-xs text-dark-400 mt-1">{stats.totalAttended} of {stats.totalHeld} classes attended</p>
              <div className="flex items-center gap-1.5 mt-2">
                {stats.overall >= 75
                  ? <><TrendingUp size={11} className="text-green-400" /><span className="text-xs text-green-400 font-bold">On track ✓</span></>
                  : <><AlertTriangle size={11} className="text-yellow-400" /><span className="text-xs text-yellow-400 font-bold">Needs improvement</span></>
                }
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full bg-dark-700">
            <motion.div className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${ringColor}, ${ringColor}99)` }}
              initial={{ width: 0 }}
              animate={{ width: `${stats.overall}%` }}
              transition={{ delay: 0.4, duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-dark-600">0%</span>
            <span className="text-[9px] text-green-600 font-bold">75% target</span>
            <span className="text-[9px] text-dark-600">100%</span>
          </div>

          {/* 75% target line marker */}
          <div className="relative mt-1">
            <div className="absolute h-2 w-px bg-green-500/50" style={{ left: '75%', top: -8 }} />
          </div>
        </div>

        {/* Bottom stats row */}
        <div className="grid grid-cols-3 border-t" style={{ borderColor: 'rgba(34,197,94,0.15)' }}>
          {[
            { label: 'Good ≥75%', count: stats.good,    color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
            { label: 'Warning',   count: stats.warning,  color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
            { label: 'At Risk',   count: stats.danger,   color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
          ].map((item, i) => (
            <div key={item.label} className={`py-3 text-center ${i < 2 ? 'border-r' : ''}`}
              style={{ background: item.bg, borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="text-2xl font-black" style={{ color: item.color, fontFamily: 'Georgia, serif' }}>{item.count}</p>
              <p className="text-[9px] font-semibold uppercase tracking-wider" style={{ color: `${item.color}88` }}>{item.label}</p>
            </div>
          ))}
        </div>
      </motion.div>

      {/* ── VIEW TOGGLE + FILTERS ────────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-5 mb-4">
        <div className="flex rounded-2xl p-1 gap-1" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)' }}>
          {[
            { id: 'courses', icon: <CheckCircle size={13} />, label: 'Courses' },
            { id: 'weekly',  icon: <BarChart2 size={13} />,   label: 'Weekly' },
          ].map(({ id, icon, label }) => (
            <button key={id} onClick={() => setView(id as any)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all touch-manipulation"
              style={view === id
                ? { background: 'linear-gradient(135deg, #22c55e, #059669)', color: '#000' }
                : { color: '#6b7280' }}>
              {icon}{label}
            </button>
          ))}
        </div>
        {view === 'courses' && (
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide flex-1">
            {([['all','All'], ['good','≥75%'], ['warning','Warn'], ['danger','Risk']] as [Filter, string][]).map(([id, label]) => (
              <button key={id} onClick={() => setFilter(id)}
                className="shrink-0 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-all touch-manipulation"
                style={filter === id
                  ? { background: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }
                  : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#4b5563' }}>
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {view === 'weekly' ? (
          <motion.div key="weekly" className="px-5 space-y-2.5"
            initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <div className="rounded-2xl overflow-hidden" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="px-5 pt-5 pb-2">
                <p className="text-xs font-black text-dark-400 uppercase tracking-widest">Attendance by Day</p>
              </div>
              <div className="px-5 pb-5 space-y-4">
                {weeklyStats.filter(d => d.count > 0).map((d, i) => {
                  const color = d.pct >= 75 ? '#22c55e' : d.pct >= 50 ? '#fbbf24' : '#f87171';
                  return (
                    <motion.div key={d.day}
                      initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-bold text-white w-28">{d.day}</span>
                        <span className="text-xs font-mono text-dark-500">{d.attended}/{d.held}</span>
                        <span className="text-xs font-black" style={{ color }}>{d.pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <motion.div className="h-full rounded-full"
                          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
                          initial={{ width: 0 }} animate={{ width: `${d.pct}%` }}
                          transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.06 }}
                        />
                      </div>
                    </motion.div>
                  );
                })}
                {weeklyStats.every(d => d.count === 0) && (
                  <p className="text-sm text-dark-500 text-center py-8">No data yet — start marking attendance</p>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div key="courses" className="px-5 space-y-3"
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
            {filteredClasses.length === 0 ? (
              <EmptyState icon={<CheckCircle size={28} />} title="No courses found"
                description="Attendance records appear once you start tracking." />
            ) : (
              filteredClasses.map((cls, i) => {
                const colors  = getColorClasses(cls.colorLabel);
                const missing = cls.totalClassesHeld - cls.totalClassesAttended;
                const needed75 = Math.max(0, Math.ceil((0.75 * cls.totalClassesHeld - cls.totalClassesAttended) / 0.25));
                const pctColor = cls.attendancePercentage >= 75 ? '#22c55e' : cls.attendancePercentage >= 50 ? '#fbbf24' : '#f87171';

                return (
                  <motion.div key={cls.id}
                    className="rounded-2xl overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
                    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05, type: 'spring', stiffness: 300 }}
                  >
                    {/* Color accent top bar */}
                    <div className={`h-1 w-full ${colors.dot}`} />

                    <div className="p-4">
                      {/* Course header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-bold text-white">{cls.courseName}</h3>
                          <p className={`text-xs font-mono mt-0.5 ${colors.text}`}>{cls.courseCode}</p>
                        </div>
                        <AttendanceBadge percentage={cls.attendancePercentage} />
                      </div>

                      {/* Progress bar */}
                      <div className="mb-3">
                        <div className="flex justify-between mb-1">
                          <span className="text-[10px] text-dark-500">Attendance</span>
                          <span className="text-[10px] font-black" style={{ color: pctColor }}>{cls.attendancePercentage}%</span>
                        </div>
                        <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <motion.div className="h-full rounded-full"
                            style={{ background: `linear-gradient(90deg, ${pctColor}, ${pctColor}77)` }}
                            initial={{ width: 0 }}
                            animate={{ width: `${cls.attendancePercentage}%` }}
                            transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.05 }}
                          />
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="flex items-center justify-between text-xs mb-3">
                        <div className="flex gap-3">
                          <span className="font-bold text-green-400">✓ {cls.totalClassesAttended} attended</span>
                          <span className="font-bold text-red-400">✗ {missing} missed</span>
                        </div>
                        <span className="text-dark-500">{cls.totalClassesHeld} total</span>
                      </div>

                      {/* Warning banner */}
                      {cls.totalClassesHeld > 0 && cls.attendancePercentage < 75 && needed75 > 0 && (
                        <motion.div className="flex items-center gap-2 py-2 px-3 rounded-xl mb-3"
                          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
                          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
                          <AlertTriangle size={11} className="text-yellow-400 shrink-0" />
                          <p className="text-xs text-yellow-300 font-medium">
                            Attend next <span className="font-black">{needed75}</span> class{needed75 !== 1 ? 'es' : ''} to reach 75%
                          </p>
                        </motion.div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => handleMark(cls.id, true)}
                          disabled={marking === `${cls.id}-true`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold touch-manipulation"
                          style={{
                            background: marking === `${cls.id}-true` ? 'rgba(34,197,94,0.25)' : 'rgba(34,197,94,0.1)',
                            border: '1px solid rgba(34,197,94,0.25)',
                            color: '#4ade80',
                            opacity: marking === `${cls.id}-true` ? 0.6 : 1,
                          }}
                          whileTap={{ scale: 0.95 }}>
                          {marking === `${cls.id}-true`
                            ? <motion.div className="w-3 h-3 border-2 border-green-400 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} />
                            : <CheckCircle size={13} />
                          }
                          {marking === `${cls.id}-true` ? 'Saving…' : 'Attended'}
                        </motion.button>
                        <motion.button
                          onClick={() => handleMark(cls.id, false)}
                          disabled={marking === `${cls.id}-false`}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold touch-manipulation"
                          style={{
                            background: marking === `${cls.id}-false` ? 'rgba(248,113,113,0.2)' : 'rgba(248,113,113,0.08)',
                            border: '1px solid rgba(248,113,113,0.2)',
                            color: '#f87171',
                            opacity: marking === `${cls.id}-false` ? 0.6 : 1,
                          }}
                          whileTap={{ scale: 0.95 }}>
                          {marking === `${cls.id}-false`
                            ? <motion.div className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full"
                                animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }} />
                            : <XCircle size={13} />
                          }
                          {marking === `${cls.id}-false` ? 'Saving…' : 'Missed'}
                        </motion.button>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}