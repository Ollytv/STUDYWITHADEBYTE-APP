"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Dashboard;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const useStore_1 = require("../hooks/useStore");
const ClassCard_1 = require("../components/timetable/ClassCard");
const ProgressRing_1 = require("../components/ui/ProgressRing");
const time_1 = require("../utils/time");
const gpa_1 = require("../utils/gpa");
const types_1 = require("../types");
const MOTIVATIONS = [
    { text: "Keep pushing — your future self will thank you!", emoji: "🚀" },
    { text: "Consistency beats perfection. Show up today!", emoji: "🔥" },
    { text: "Every class attended is an investment in your future.", emoji: "⚡" },
    { text: "One step closer to graduation. Keep going!", emoji: "💪" },
    { text: "Study hard, shine bright — the best is yet to come!", emoji: "🌟" },
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
function Dashboard() {
    const { classes, profile, assignments, gpaCourses, studySessions, setActiveTab, setShowAddClass, markAttendance, setEditingClass, activeSemester, activeAcademicYear } = (0, useStore_1.useStore)();
    // Resolve school scale — falls back to 5.0 for users who pre-date this feature
    const scale = profile?.cgpaScale ?? types_1.DEFAULT_CGPA_SCALE;
    const today = (0, time_1.getCurrentDayName)();
    const todayClasses = (0, react_1.useMemo)(() => (0, time_1.sortClassesByTime)(classes.filter(c => c.day === today && c.semester === activeSemester && c.academicYear === activeAcademicYear)), [classes, today, activeSemester, activeAcademicYear]);
    const semClasses = (0, react_1.useMemo)(() => classes.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear), [classes, activeSemester, activeAcademicYear]);
    const stats = (0, react_1.useMemo)(() => {
        const totalHeld = semClasses.reduce((s, c) => s + c.totalClassesHeld, 0);
        const totalAttended = semClasses.reduce((s, c) => s + c.totalClassesAttended, 0);
        const overallAttendance = totalHeld > 0 ? Math.round((totalAttended / totalHeld) * 100) : 0;
        const atRisk = semClasses.filter(c => c.totalClassesHeld > 3 && c.attendancePercentage < 75).length;
        return { totalClasses: semClasses.length, totalAttended, totalHeld, overallAttendance, atRisk };
    }, [semClasses]);
    const nextClass = (0, react_1.useMemo)(() => todayClasses.filter(c => (0, time_1.getMinutesUntilClass)(c.startTime) > 0)[0] || null, [todayClasses]);
    const semGPACourses = (0, react_1.useMemo)(() => gpaCourses.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear), [gpaCourses, activeSemester, activeAcademicYear]);
    const rawGpa = (0, react_1.useMemo)(() => (0, gpa_1.calculateGPA)(semGPACourses), [semGPACourses]);
    const gpa = (0, gpa_1.normaliseGPA)(rawGpa, scale);
    const gpaClass = (0, gpa_1.getGPAClass)(gpa, scale);
    const pendingAssignments = (0, react_1.useMemo)(() => assignments.filter(a => !a.completed && a.semester === activeSemester && a.academicYear === activeAcademicYear).length, [assignments, activeSemester, activeAcademicYear]);
    const todayStudyMins = (0, react_1.useMemo)(() => {
        const d = new Date().toISOString().split('T')[0];
        return studySessions.filter(s => s.date === d && s.type === 'study').reduce((sum, s) => sum + s.duration, 0);
    }, [studySessions]);
    const motivation = MOTIVATIONS[new Date().getDay() % MOTIVATIONS.length];
    const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
    const firstName = profile?.fullName?.split(' ')[0] || null;
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    return (<div className="min-h-screen bg-dark-950 pb-28">

      {/* ── HERO HEADER ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(34,197,94,0.18) 0%, rgba(5,150,105,0.08) 40%, transparent 70%)' }}/>
        {/* Decorative circle */}
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full" style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)' }}/>

        <div className="relative px-5 pt-14 pb-6">
          <div className="flex items-center justify-between">
            <div>
              <framer_motion_1.motion.p className="text-xs font-medium text-green-400/80 uppercase tracking-widest mb-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                {greeting} 👋
              </framer_motion_1.motion.p>
              <framer_motion_1.motion.h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15 }}>
                {firstName ? firstName : 'StudyWithAdebyte'}
              </framer_motion_1.motion.h1>
              <framer_motion_1.motion.p className="text-xs text-dark-400 mt-0.5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                {profile?.department
            ? `${profile.department} • ${profile.programLevel}`
            : `${activeSemester} Semester`}
              </framer_motion_1.motion.p>
            </div>

            {/* Avatar */}
            <framer_motion_1.motion.button onClick={() => setActiveTab('settings')} className="relative flex-shrink-0" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300 }} whileTap={{ scale: 0.9 }}>
              {/* Pulse ring */}
              <framer_motion_1.motion.div className="absolute inset-0 rounded-2xl border-2 border-green-400/40" animate={{ scale: [1, 1.12, 1], opacity: [0.6, 0, 0.6] }} transition={{ duration: 2.5, repeat: Infinity }}/>
              <div className="w-14 h-14 rounded-2xl overflow-hidden border-2 border-green-500/50">
                {profile?.avatar ? (<img src={profile.avatar} alt="avatar" className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #065f46)' }}>
                    <span className="text-base font-black text-white">{initials}</span>
                  </div>)}
              </div>
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-dark-950"/>
            </framer_motion_1.motion.button>
          </div>
        </div>
      </div>

      {/* ── MOTIVATION BANNER ────────────────────────────────────────────── */}
      <framer_motion_1.motion.div className="mx-5 mb-5 rounded-2xl overflow-hidden relative" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.15), rgba(5,150,105,0.08))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25, type: 'spring', stiffness: 300 }}>
        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-4 text-4xl opacity-20">
          {motivation.emoji}
        </div>
        <div className="p-4 pr-14">
          <div className="flex items-center gap-1.5 mb-1">
            <lucide_react_1.Zap size={11} className="text-green-400"/>
            <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">Daily Motivation</span>
          </div>
          <p className="text-sm font-medium text-white/90 leading-relaxed">{motivation.text}</p>
        </div>
      </framer_motion_1.motion.div>

      {/* ── STATS GRID ───────────────────────────────────────────────────── */}
      <framer_motion_1.motion.div className="px-5 mb-5" variants={stagger.container} initial="initial" animate="animate">
        {/* Main attendance card */}
        <framer_motion_1.motion.div variants={stagger.item} className="rounded-2xl p-5 mb-3 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, #1a2e1a, #0f1f10)', border: '1px solid rgba(34,197,94,0.25)' }}>
          {/* Background decoration */}
          <div className="absolute right-0 top-0 w-32 h-32 rounded-full opacity-20" style={{ background: 'radial-gradient(circle, #22c55e, transparent)', transform: 'translate(30%, -30%)' }}/>
          <div className="flex items-center gap-4">
            <ProgressRing_1.ProgressRing percentage={stats.overallAttendance} size={72} strokeWidth={6} color="#22c55e">
              <span className="text-sm font-black text-white">{stats.overallAttendance}%</span>
            </ProgressRing_1.ProgressRing>
            <div className="flex-1">
              <p className="text-xs text-green-400/70 font-medium uppercase tracking-wider mb-0.5">Attendance Rate</p>
              <p className="text-3xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-1px' }}>
                {stats.overallAttendance}<span className="text-lg text-green-400/60">%</span>
              </p>
              <p className="text-xs text-dark-400 mt-0.5">{stats.totalAttended}/{stats.totalHeld} classes attended</p>
            </div>
            {semGPACourses.length > 0 && (<div className="text-right">
                <p className="text-xs text-dark-400 mb-0.5">GPA</p>
                <p className="text-2xl font-black" style={{ color: gpaClass.color, fontFamily: 'Georgia, serif' }}>
                  {gpa.toFixed(2)}
                </p>
                <p className="text-[10px] font-bold" style={{ color: gpaClass.color }}>{gpaClass.label}</p>
              </div>)}
          </div>
        </framer_motion_1.motion.div>

        {/* 4 mini stat cards */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Courses', value: stats.totalClasses, icon: lucide_react_1.CalendarDays, color: '#60a5fa', bg: 'rgba(96,165,250,0.1)', border: 'rgba(96,165,250,0.2)', sub: 'enrolled' },
            { label: 'Due Tasks', value: pendingAssignments, icon: lucide_react_1.ClipboardList, color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)', sub: 'pending' },
            { label: 'Study Today', value: `${todayStudyMins}m`, icon: lucide_react_1.Timer, color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)', sub: 'minutes' },
            { label: 'At Risk', value: stats.atRisk, icon: lucide_react_1.AlertTriangle, color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.2)', sub: 'below 75%' },
        ].map((s, i) => (<framer_motion_1.motion.div key={s.label} variants={stagger.item} className="rounded-2xl p-4 relative overflow-hidden" style={{ background: s.bg, border: `1px solid ${s.border}` }}>
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20` }}>
                  <s.icon size={16} style={{ color: s.color }}/>
                </div>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: `${s.color}99` }}>
                  {s.sub}
                </span>
              </div>
              <p className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{s.value}</p>
              <p className="text-xs mt-0.5" style={{ color: `${s.color}aa` }}>{s.label}</p>
            </framer_motion_1.motion.div>))}
        </div>
      </framer_motion_1.motion.div>

      {/* ── NEXT CLASS CARD ──────────────────────────────────────────────── */}
      <framer_motion_1.AnimatePresence>
        {nextClass && (<framer_motion_1.motion.div className="mx-5 mb-5 rounded-2xl p-4 relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(5,150,105,0.06))', border: '1px solid rgba(34,197,94,0.25)' }} initial={{ opacity: 0, y: 15, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.35, type: 'spring', stiffness: 300 }}>
            {/* Pulsing dot */}
            <div className="absolute top-4 right-4">
              <framer_motion_1.motion.div className="w-2.5 h-2.5 rounded-full bg-green-400" animate={{ scale: [1, 1.4, 1], opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}/>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <lucide_react_1.Clock size={12} className="text-green-400"/>
              <span className="text-[10px] font-black text-green-400 uppercase tracking-widest">
                {(0, time_1.isClassNow)(nextClass.startTime, nextClass.endTime) ? '● Happening Now' : 'Next Class'}
              </span>
            </div>
            <p className="text-base font-bold text-white mb-0.5">{nextClass.courseName}</p>
            <p className="text-xs text-dark-400">{nextClass.venue} • {nextClass.startTime} – {nextClass.endTime}</p>
            {!(0, time_1.isClassNow)(nextClass.startTime, nextClass.endTime) && (<div className="mt-2 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-green-400" style={{ fontFamily: 'Georgia, serif' }}>
                  {(0, time_1.formatCountdown)((0, time_1.getMinutesUntilClass)(nextClass.startTime))}
                </span>
                <span className="text-sm text-dark-400">away</span>
              </div>)}
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      {/* ── TODAY'S CLASSES ──────────────────────────────────────────────── */}
      <div className="px-5 mb-5">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>Today's Classes</h2>
            <p className="text-xs text-dark-500">{today} · {todayClasses.length} scheduled</p>
          </div>
          <button onClick={() => setActiveTab('timetable')} className="flex items-center gap-1 text-xs font-semibold text-green-400 touch-manipulation">
            View all <lucide_react_1.ChevronRight size={13}/>
          </button>
        </div>

        {todayClasses.length === 0 ? (<framer_motion_1.motion.div className="rounded-2xl p-6 text-center" style={{ background: 'rgba(255,255,255,0.03)', border: '1px dashed rgba(255,255,255,0.1)' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="text-3xl mb-2">🎉</div>
            <p className="text-sm text-dark-400 mb-3">No classes today — enjoy your break!</p>
            <button onClick={() => setShowAddClass(true)} className="inline-flex items-center gap-1.5 text-xs font-semibold text-green-400 border border-green-500/30 px-3 py-2 rounded-xl touch-manipulation">
              <lucide_react_1.Plus size={12}/> Add a class
            </button>
          </framer_motion_1.motion.div>) : (<div className="space-y-3">
            {todayClasses.map((cls, i) => (<framer_motion_1.motion.div key={cls.id} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.05 * i, type: 'spring', stiffness: 300 }}>
                <ClassCard_1.ClassCard cls={cls} index={i} onEdit={c => { setEditingClass(c); setShowAddClass(true); }} onMarkAttendance={(id, attended) => markAttendance(id, attended)}/>
              </framer_motion_1.motion.div>))}
          </div>)}
      </div>

      {/* ── QUICK ACCESS ─────────────────────────────────────────────────── */}
      <div className="px-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>Quick Access</h2>
          <lucide_react_1.BookOpen size={14} className="text-dark-600"/>
        </div>
        <div className="grid grid-cols-2 gap-3 pb-2">
          {[
            { label: 'Add Class', icon: lucide_react_1.Plus, action: () => { setActiveTab('timetable'); setShowAddClass(true); }, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
            { label: 'GPA Tracker', icon: lucide_react_1.TrendingUp, action: () => setActiveTab('gpa'), color: '#fbbf24', bg: 'rgba(251,191,36,0.1)', border: 'rgba(251,191,36,0.2)' },
            { label: 'Assignments', icon: lucide_react_1.FileText, action: () => setActiveTab('assignments'), color: '#c084fc', bg: 'rgba(192,132,252,0.1)', border: 'rgba(192,132,252,0.2)' },
            { label: 'Study Timer', icon: lucide_react_1.Timer, action: () => setActiveTab('timer'), color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.2)' },
        ].map((item, i) => (<framer_motion_1.motion.button key={item.label} onClick={item.action} className="rounded-2xl p-4 flex flex-col items-start gap-3 touch-manipulation text-left relative overflow-hidden" style={{ background: item.bg, border: `1px solid ${item.border}` }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.07, type: 'spring', stiffness: 300 }} whileTap={{ scale: 0.95 }}>
              {/* Corner decoration */}
              <div className="absolute -top-4 -right-4 w-12 h-12 rounded-full opacity-20" style={{ background: item.color }}/>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${item.color}25` }}>
                <item.icon size={18} style={{ color: item.color }}/>
              </div>
              <p className="text-sm font-bold text-white">{item.label}</p>
            </framer_motion_1.motion.button>))}
        </div>
      </div>
    </div>);
}
//# sourceMappingURL=Dashboard.js.map