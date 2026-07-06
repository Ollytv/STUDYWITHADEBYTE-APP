"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = More;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const useStore_1 = require("../hooks/useStore");
const gpa_1 = require("../utils/gpa");
const react_1 = require("react");
const features = [
    {
        id: 'gpa',
        icon: lucide_react_1.TrendingUp,
        label: 'GPA Tracker',
        desc: 'Calculate and track your semester GPA',
        color: '#fbbf24',
        bg: 'rgba(251,191,36,0.1)',
        border: 'rgba(251,191,36,0.2)',
        tab: 'gpa',
        emoji: '📊',
    },
    {
        id: 'timer',
        icon: lucide_react_1.Timer,
        label: 'Study Timer',
        desc: 'Pomodoro technique for focused studying',
        color: '#fb923c',
        bg: 'rgba(251,146,60,0.1)',
        border: 'rgba(251,146,60,0.2)',
        tab: 'timer',
        emoji: '⏱️',
    },
    {
        id: 'assignments',
        icon: lucide_react_1.ClipboardList,
        label: 'Assignments',
        desc: 'Track deadlines and pending tasks',
        color: '#c084fc',
        bg: 'rgba(192,132,252,0.1)',
        border: 'rgba(192,132,252,0.2)',
        tab: 'assignments',
        emoji: '📋',
    },
    {
        id: 'materials',
        icon: lucide_react_1.BookOpen,
        label: 'Course Materials',
        desc: 'Upload and manage study files',
        color: '#22d3ee',
        bg: 'rgba(34,211,238,0.1)',
        border: 'rgba(34,211,238,0.2)',
        tab: 'materials',
        emoji: '📚',
    },
    {
        id: 'ai',
        icon: lucide_react_1.Brain,
        label: 'AI Study Assistant',
        desc: 'Ask questions, get explanations, study smarter',
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.1)',
        border: 'rgba(168,85,247,0.2)',
        tab: 'ai',
        emoji: '🤖',
    },
];
function More() {
    const { setActiveTab, gpaCourses, assignments, materials, activeSemester, activeAcademicYear, profile } = (0, useStore_1.useStore)();
    const semGPA = (0, react_1.useMemo)(() => gpaCourses.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear), [gpaCourses, activeSemester, activeAcademicYear]);
    const gpa = (0, react_1.useMemo)(() => (0, gpa_1.calculateGPA)(semGPA), [semGPA]);
    const gpaClass = (0, gpa_1.getGPAClass)(gpa);
    const pendingAssign = assignments.filter(a => !a.completed && a.semester === activeSemester && a.academicYear === activeAcademicYear).length;
    const semMaterials = materials.filter(m => m.semester === activeSemester && m.academicYear === activeAcademicYear).length;
    const badges = {
        gpa: semGPA.length > 0 ? gpa.toFixed(2) : null,
        assignments: pendingAssign > 0 ? `${pendingAssign}` : null,
        materials: semMaterials > 0 ? `${semMaterials}` : null,
        timer: null,
        ai: null,
    };
    const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
    return (<div className="min-h-screen bg-dark-950 pb-28">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg, rgba(192,132,252,0.1) 0%, rgba(34,211,238,0.05) 50%, transparent 80%)' }}/>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full" style={{ background: 'radial-gradient(circle, rgba(192,132,252,0.1) 0%, transparent 70%)' }}/>
        <div className="relative px-5 pt-14 pb-6">
          <framer_motion_1.motion.div className="flex items-center gap-2 mb-1" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
            <lucide_react_1.Sparkles size={14} className="text-purple-400"/>
            <span className="text-xs font-bold text-purple-400/80 uppercase tracking-widest">Tools & Features</span>
          </framer_motion_1.motion.div>
          <framer_motion_1.motion.h1 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
            More Features
          </framer_motion_1.motion.h1>
          <framer_motion_1.motion.p className="text-xs text-dark-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Productivity tools for All students.
          </framer_motion_1.motion.p>
        </div>
      </div>

      {/* ── GPA HERO CARD (if data exists) ──────────────────────────────── */}
      {semGPA.length > 0 && (<framer_motion_1.motion.button onClick={() => setActiveTab('gpa')} className="mx-5 mb-5 rounded-2xl p-5 w-[calc(100%-40px)] text-left relative overflow-hidden touch-manipulation" style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.05))', border: '1px solid rgba(251,191,36,0.3)' }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, type: 'spring', stiffness: 280 }} whileTap={{ scale: 0.97 }}>
          {/* Background decoration */}
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full opacity-15" style={{ background: 'radial-gradient(circle, #fbbf24, transparent)' }}/>
          <div className="absolute right-4 top-4 text-4xl opacity-20">🏆</div>

          <div className="flex items-end justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <lucide_react_1.Star size={11} className="text-yellow-400" fill="#fbbf24"/>
                <span className="text-[10px] font-black text-yellow-400 uppercase tracking-widest">Current GPA</span>
              </div>
              <p className="text-5xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-2px' }}>
                {gpa.toFixed(2)}
              </p>
              <p className="text-sm font-bold mt-1" style={{ color: gpaClass.color }}>{gpaClass.label}</p>
            </div>
            <div className="text-right pb-1">
              <p className="text-xs text-dark-400 mb-1">{semGPA.length} courses</p>
              <div className="flex items-center gap-1 text-yellow-400/60 text-xs font-semibold">
                View tracker <lucide_react_1.ChevronRight size={12}/>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)' }}>
            <framer_motion_1.motion.div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #fbbf24, #f59e0b)' }} initial={{ width: 0 }} animate={{ width: `${(gpa / 5) * 100}%` }} transition={{ delay: 0.5, duration: 0.8, ease: 'easeOut' }}/>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-dark-600">0.0</span>
            <span className="text-[9px] text-dark-600">5.0</span>
          </div>
        </framer_motion_1.motion.button>)}

      {/* ── FEATURE CARDS ────────────────────────────────────────────────── */}
      <div className="px-5 space-y-3">
        {features.map((feat, i) => (<framer_motion_1.motion.button key={feat.id} onClick={() => setActiveTab(feat.tab)} className="w-full flex items-center gap-4 p-4 rounded-2xl text-left touch-manipulation relative overflow-hidden" style={{ background: feat.bg, border: `1px solid ${feat.border}` }} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.08, type: 'spring', stiffness: 300, damping: 25 }} whileTap={{ scale: 0.96 }}>
            {/* Corner emoji */}
            <div className="absolute right-3 top-2 text-2xl opacity-15">{feat.emoji}</div>

            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 relative" style={{ background: `${feat.color}18` }}>
              <feat.icon size={22} style={{ color: feat.color }}/>
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{feat.label}</p>
              <p className="text-xs text-dark-400 mt-0.5">{feat.desc}</p>
            </div>

            {/* Badge + arrow */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {badges[feat.id] && (<framer_motion_1.motion.span className="text-xs font-black px-2.5 py-1 rounded-xl" style={{ background: `${feat.color}18`, color: feat.color }} initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.3 + i * 0.08, type: 'spring', stiffness: 400 }}>
                  {badges[feat.id]}
                </framer_motion_1.motion.span>)}
              <lucide_react_1.ChevronRight size={16} className="text-dark-600"/>
            </div>
          </framer_motion_1.motion.button>))}
      </div>

      {/* ── BOTTOM STUDENT CARD ──────────────────────────────────────────── */}
      {profile && (<framer_motion_1.motion.div className="mx-5 mt-5 rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl overflow-hidden border border-green-500/30 flex-shrink-0">
              {profile.avatar ? (<img src={profile.avatar} alt="avatar" className="w-full h-full object-cover"/>) : (<div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #22c55e, #065f46)' }}>
                  <span className="text-xs font-black text-white">{initials}</span>
                </div>)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{profile.fullName}</p>
              <p className="text-xs text-dark-400">{profile.department} · {profile.programLevel}</p>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-dark-600 uppercase tracking-wider">Semester</p>
              <p className="text-xs font-bold text-green-400">{activeSemester}</p>
            </div>
          </div>
        </framer_motion_1.motion.div>)}
    </div>);
}
//# sourceMappingURL=More.js.map