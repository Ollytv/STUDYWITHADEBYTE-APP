import { motion, AnimatePresence } from 'framer-motion';
import { CalendarDays, AlertTriangle, Clock, Plus, TrendingUp, FileText, Timer, ClipboardList, Zap, ChevronRight, BookOpen } from 'lucide-react';
import { useMemo } from 'react';
import { useStore } from '../hooks/useStore';
import { ClassCard } from '../components/timetable/ClassCard';
import { ProgressRing } from '../components/ui/ProgressRing';
import { Button } from '../components/ui/Button';
import { getCurrentDayName, sortClassesByTime, formatCountdown, getMinutesUntilClass, isClassNow } from '../utils/time';
import { calculateGPA, getGPAClass } from '../utils/gpa';

const MOTIVATIONS = [
  { text: "Keep pushing — your future self will thank you!", emoji: "🚀" },
  { text: "Consistency beats perfection. Show up today!", emoji: "🔥" },
  { text: "Every class attended is an investment in your future.", emoji: "⚡" },
  { text: "One step closer to graduation. Keep going!", emoji: "💪" },
  { text: "POLYIBADAN best! Study hard, shine bright!", emoji: "🌟" },
  { text: "Small daily progress leads to massive results.", emoji: "🎯" },
  { text: "Your dedication today shapes your tomorrow.", emoji: "✨" },
];

const stagger = {
  container: { animate: { transition: { staggerChildren: 0.07 } } },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 28 } },
  },
};

export default function Dashboard() {
  const { classes, profile, assignments, gpaCourses, studySessions,
    setActiveTab, setShowAddClass, markAttendance, setEditingClass,
    activeSemester, activeAcademicYear } = useStore();

  const today = getCurrentDayName();
  const todayClasses = useMemo(() =>
    sortClassesByTime(classes.filter(c =>
      c.day === today && c.semester === activeSemester && c.academicYear === activeAcademicYear
    )) as typeof classes,
    [classes, today, activeSemester, activeAcademicYear]);

  const semClasses = useMemo(() =>
    classes.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear),
    [classes, activeSemester, activeAcademicYear]);

  const stats = useMemo(() => {
    const totalHeld     = semClasses.reduce((s, c) => s + c.totalClassesHeld, 0);
    const totalAttended = semClasses.reduce((s, c) => s + c.totalClassesAttended, 0);
    const overallAttendance = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;
    const atRisk = semClasses.filter(c => c.totalClassesHeld > 3 && c.attendancePercentage < 75).length;
    return { totalClasses: semClasses.length, totalAttended, totalHeld, overallAttendance, atRisk };
  }, [semClasses]);

  const nextClass = useMemo(() =>
    todayClasses.filter(c => getMinutesUntilClass(c.startTime) > 0)[0] || null,
    [todayClasses]);

  const semGPACourses = useMemo(() =>
    gpaCourses.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear),
    [gpaCourses, activeSemester, activeAcademicYear]);

  const gpa      = useMemo(() => calculateGPA(semGPACourses), [semGPACourses]);
  const gpaClass = getGPAClass(gpa);

  const pendingAssignments = useMemo(() =>
    assignments.filter(a => !a.completed && a.semester === activeSemester && a.academicYear === activeAcademicYear).length,
    [assignments, activeSemester, activeAcademicYear]);

  const todayStudyMins = useMemo(() => {
    const d = new Date().toISOString().split('T')[0];
    return studySessions.filter(s => s.date === d && s.type === 'study').reduce((sum, s) => sum + s.duration, 0);
  }, [studySessions]);

  const motivation = MOTIVATIONS[new Date().getDay() % MOTIVATIONS.length];
  const initials   = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
  const firstName  = profile?.fullName?.split(' ')[0] || null;
  const hour       = new Date().getHours();
  const greeting   = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="min-h-screen bg-dark-950 pb-28">

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(160deg, rgba(34,197,94,0.18) 0%, rgba(5,150,105,0.08) 40%, transparent 70%)' }}
        />
        {/* Decorative circle */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)' }}
        />

        <div className="relative px-5 pt-14 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <motion.p
                className="text-xs font-medium text-green-400/80 uppercase tracking-widest mb-1"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {greeting} 👋
              </motion.p>
              <motion.h1
                className="text-2xl font-black text-white"
                style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 }}
              >
                {firstName ? firstName : 'StudyWithAdebyte'}
              </motion.h1>
              <motion.p
                className="text-xs text-dark-400 mt-0.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                {profile?.department
                  ? `${profile.department} • ${profile.programLevel}`
                  : `POLYIBADAN • ${activeSemester} Semester`}
              </motion.p>
            </div>

            {/* Avatar */}
            <motion.button
              onClick={() => setActiveTab('settings')}
              className="relative flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
              whileTap={{ scale: 0.9 }}
            >
              {/* Pulse ring */}
              <motion.div
                className="absolute inset-0 rounded-2xl border-2 border-green-400/40"
                animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity }}
              />
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-green-500/50">
                {profile?.avatar ? (
                  <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, #22c55e, #065f46)' }}>
                    <span className="text-base font-black text-white">{initials}</span>
                  </div>
                )}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-dark-950" />
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── MOTIVATION BANNER ────────────────────────────────────────────── */}
      <motion.div
        className="mx-5 mb-5 rounded-2xl overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(5,150,105,0.08))', border: '1px solid rgba(34,197,94,0.2)' }}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}
      >
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-4xl opacity-20">
          {motivation.emoji}
        </div>
        <div className="p-4 pr-14">
          <div className="flex items-center gap-1.5 mb-1">
            <Zap size={11} className="text-green-400" />
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Daily Motivation</span>
          </div>
          <p className="text-sm font-medium text-white/90 leading-relaxed">{motivation.text}</p>
        </div>
      </motion.div>

      {/* ── STATS GRID ───────────────────────────────────────────────────── */}
      <motion.div className="px-5 mb-5"
        variants={stagger.container}
        initial="initial"
        animate="animate"
      >
        {/* Main attendance card */}
        <motion.div variants={stagger.item}
          className="rounded-2xl p-5 mb-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1a2e1a, #0f1f10)', border: '1px solid rgba(34,197,94,0.25)' }}
        >
          {/* Background decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-20"
            style={{ background: 'radial-gradient(circle, #22c55e, transparent)', transform: 'translate(30%, -30%)' }}
          />
          <div className="flex items-center gap-4">
            <ProgressRing percentage={stats.overallAttendance} size={72} strokeWidth={6} color="#22c55e">
              <span className="text-sm font-black text-white">{stats.overallAttendance}%</span>
            </ProgressRing>
            <div className="flex-1">
              <p className="text-xs text-green-400/70 font-medium uppercase tracking-wider mb-0.5">Attendance Rate</p>
              <p className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>
                {stats.overallAttendance}<span className="text-lg text-green-400/60">%</span>
              </p>
              <p className="text-xs text-dark-400 mt-0.5">{stats.totalAttended}/{stats.totalHeld} classes attended</p>
            </div>
            {semGPACourses.length > 0 && (
              <div className="text-right">
                <p className="text-xs text-dark-400 mb-0.5">GPA</p>
                <p className="text-2xl font-black" style={{ color: gpaClass.color, fontFamily: 'Georgia, serif' }}>
                  {gpa.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold" style={{ color: gpaClass.color }}>{gpaClass.label}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* 4 mini stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Courses',      value: stats.totalClasses,   icon: CalendarDays,  color: '#60a5fa', bg: 'rgba(96,165,250,0.1)',  border: 'rgba(96,165,250,0.2)',  sub: 'enrolled' },
            { label: 'Due Tasks',    value: pendingAssignments,   icon: ClipboardList, color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)', sub: 'pending' },
            { label: 'Study Today',  value: `${todayStudyMins}m`, icon: Timer,         color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)',  sub: 'minutes' },
            { label: 'At Risk',      value: stats.atRisk,         icon: AlertTriangle, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', sub: 'below 75%' },
          ].map((s, i) => (
            <motion.div key={s.label} variants={stagger.item}
              className="rounded-2xl p-4 relative overflow-hidden"
              style={{ background: s.bg, border: `1px solid ${s.border}` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${s.color}20` }}>
                  <s.icon size={16} style={{ color: s.color }} />
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${s.color}99` }}>
                  {s.sub}
                </span>
              </div>
              <p className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: `${s.color}aa` }}>{s.label}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* ── NEXT CLASS CARD ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {nextClass && (
          <motion.div
            className="mx-5 mb-5 rounded-2xl p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(5,150,105,0.06))', border: '1px solid rgba(34,197,94,0.25)' }}
            initial={{ opacity: 0, y: 15, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.35, type: 'spring', stiffness: 300 }}
          >
            {/* Pulsing dot */}
            <div className="absolute top-4 right-4">
              <motion.div className="w-2.5 h-2.5 rounded-full bg-green-400"
                animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              />
            </div>

            <div className="flex items-center gap-2 mb-2">
              <Clock size={12} className="text-green-400" />
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                {isClassNow(nextClass.startTime, nextClass.endTime) ? '● Happening Now' : 'Next Class'}
              </span>
            </div>
            <p className="text-base font-bold text-white mb-0.5">{nextClass.courseName}</p>
            <p className="text-xs text-dark-400">{nextClass.venue} • {nextClass.startTime} – {nextClass.endTime}</p>
            {!isClassNow(nextClass.startTime, nextClass.endTime) && (
              <div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-green-400" style={{ fontFamily: 'Georgia, serif' }}>
                  {formatCountdown(getMinutesUntilClass(nextClass.startTime))}
                </span>
                <span className="text-sm text-dark-400">away</span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TODAY'S CLASSES ──────────────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>Today's Classes</h2>
            <p className="text-xs text-dark-500">{today} · {todayClasses.length} scheduled</p>
          </div>
          <button onClick={() => setActiveTab('timetable')}
            className="flex items-center gap-1 text-xs font-semibold text-green-400 touch-manipulation">
            View all <ChevronRight size={13} />
          </button>
        </div>

        {todayClasses.length === 0 ? (
          <motion.div
            className="rounded-2xl p-6 text-center"
            style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          >
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-dark-400 mb-3">No classes today — enjoy your break!</p>
            <button
              onClick={() => setShowAddClass(true)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 border border-green-500/30 px-3 py-2 rounded-xl touch-manipulation"
            >
              <Plus size={12} /> Add a class
            </button>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {todayClasses.map((cls, i) => (
              <motion.div key={cls.id}
                initial={{ opacity: 0, x: -15 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300 }}
              >
                <ClassCard cls={cls} index={i}
                  onEdit={c => { setEditingClass(c); setShowAddClass(true); }}
                  onMarkAttendance={(id, attended) => markAttendance(id, attended)}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* ── QUICK ACCESS ─────────────────────────────────────────────────── */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>Quick Access</h2>
          <BookOpen size={14} className="text-dark-600" />
        </div>
        <div className="grid grid-cols-2 gap-3 pb-2">
          {[
            { label: 'Add Class',   icon: Plus,       action: () => { setActiveTab('timetable'); setShowAddClass(true); }, color: '#22c55e', bg: 'rgba(34,197,94,0.1)',   border: 'rgba(34,197,94,0.2)' },
            { label: 'GPA Tracker', icon: TrendingUp, action: () => setActiveTab('gpa'),         color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.2)' },
            { label: 'Assignments', icon: FileText,   action: () => setActiveTab('assignments'),  color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)' },
            { label: 'Study Timer', icon: Timer,      action: () => setActiveTab('timer'),        color: '#fb923c', bg: 'rgba(251,146,60,0.1)',  border: 'rgba(251,146,60,0.2)' },
          ].map((item, i) => (
            <motion.button key={item.label} onClick={item.action}
              className="rounded-2xl p-4 flex flex-col items-start gap-3 touch-manipulation text-left relative overflow-hidden"
              style={{ background: item.bg, border: `1px solid ${item.border}` }}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 300 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Corner decoration */}
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full opacity-20"
                style={{ background: item.color }} />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${item.color}25` }}>
                <item.icon size={18} style={{ color: item.color }} />
              </div>
              <p className="text-sm font-bold text-white">{item.label}</p>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}