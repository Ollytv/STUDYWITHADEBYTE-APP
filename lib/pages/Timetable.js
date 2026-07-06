"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Timetable;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const useStore_1 = require("../hooks/useStore");
const ClassCard_1 = require("../components/timetable/ClassCard");
const ClassForm_1 = require("../components/timetable/ClassForm");
const EmptyState_1 = require("../components/ui/EmptyState");
const SemesterSwitcher_1 = require("../components/ui/SemesterSwitcher");
const time_1 = require("../utils/time");
const colors_1 = require("../utils/colors");
const DAYS = (0, time_1.getDayOrder)();
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7); // 7am–7pm
function Timetable() {
    const { classes, deleteClass, markAttendance, showAddClass, setShowAddClass, editingClass, setEditingClass, activeSemester, activeAcademicYear, } = (0, useStore_1.useStore)();
    const [selectedDay, setSelectedDay] = (0, react_1.useState)('All');
    const [searchQuery, setSearchQuery] = (0, react_1.useState)('');
    const [viewMode, setViewMode] = (0, react_1.useState)('list');
    const semClasses = (0, react_1.useMemo)(() => classes.filter(c => c.semester === activeSemester && c.academicYear === activeAcademicYear), [classes, activeSemester, activeAcademicYear]);
    const filteredClasses = (0, react_1.useMemo)(() => {
        let result = semClasses;
        if (selectedDay !== 'All')
            result = result.filter(c => c.day === selectedDay);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(c => c.courseName.toLowerCase().includes(q) ||
                c.courseCode.toLowerCase().includes(q) ||
                c.lecturer.toLowerCase().includes(q) ||
                c.venue.toLowerCase().includes(q));
        }
        return result;
    }, [semClasses, selectedDay, searchQuery]);
    const classesByDay = (0, react_1.useMemo)(() => {
        if (selectedDay !== 'All')
            return { [selectedDay]: filteredClasses };
        const grouped = {};
        for (const day of DAYS) {
            const dayClasses = filteredClasses.filter(c => c.day === day);
            if (dayClasses.length > 0)
                grouped[day] = dayClasses;
        }
        return grouped;
    }, [filteredClasses, selectedDay]);
    const handleDelete = async (id) => {
        if (window.confirm('Delete this class and all attendance records?'))
            await deleteClass(id);
    };
    return (<div className="min-h-screen bg-dark-950 pb-28">

      {/* ── STICKY HEADER ────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 backdrop-blur-2xl" style={{ background: 'rgba(10,10,15,0.92)' }}>

        {/* Title row */}
        <div className="px-5 pt-14 pb-3">
          <div className="flex items-center justify-between">
            <div>
              <framer_motion_1.motion.div className="flex items-center gap-2 mb-0.5" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                <lucide_react_1.Calendar size={13} className="text-blue-400"/>
                <span className="text-[10px] font-black text-blue-400/80 uppercase tracking-widest">Schedule</span>
              </framer_motion_1.motion.div>
              <framer_motion_1.motion.h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.07 }}>
                Timetable
              </framer_motion_1.motion.h1>
              <p className="text-xs text-dark-400">{semClasses.length} course{semClasses.length !== 1 ? 's' : ''} this semester</p>
            </div>

            <div className="flex items-center gap-2">
              {/* View mode toggle */}
              <framer_motion_1.motion.button onClick={() => setViewMode(v => v === 'list' ? 'grid' : 'list')} className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors touch-manipulation" style={{ background: viewMode === 'grid' ? 'rgba(96,165,250,0.15)' : 'rgba(255,255,255,0.05)', border: viewMode === 'grid' ? '1px solid rgba(96,165,250,0.3)' : '1px solid rgba(255,255,255,0.07)', color: viewMode === 'grid' ? '#60a5fa' : '#6b7280' }} whileTap={{ scale: 0.9 }}>
                {viewMode === 'list' ? <lucide_react_1.Grid3X3 size={15}/> : <lucide_react_1.List size={15}/>}
              </framer_motion_1.motion.button>

              {/* Add button */}
              <framer_motion_1.motion.button onClick={() => { setEditingClass(null); setShowAddClass(true); }} className="w-11 h-11 rounded-2xl flex items-center justify-center touch-manipulation" style={{ background: 'linear-gradient(135deg, #22c55e, #059669)', boxShadow: '0 0 20px rgba(34,197,94,0.3)' }} whileTap={{ scale: 0.9 }}>
                <lucide_react_1.Plus size={20} className="text-dark-950"/>
              </framer_motion_1.motion.button>
            </div>
          </div>
        </div>

        <SemesterSwitcher_1.SemesterSwitcher />

        {/* Search bar */}
        <div className="px-5 pb-3">
          <div className="relative mb-3">
            <lucide_react_1.Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500"/>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Search courses, lecturers, venues..." className="w-full pl-10 pr-10 py-3 rounded-2xl text-sm font-medium text-white placeholder-dark-600 focus:outline-none touch-manipulation" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}/>
            {searchQuery && (<button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white touch-manipulation">
                <lucide_react_1.X size={15}/>
              </button>)}
          </div>

          {/* Day filter pills */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {['All', ...DAYS].map(day => {
            const isActive = selectedDay === day;
            const count = day === 'All'
                ? semClasses.length
                : semClasses.filter(c => c.day === day).length;
            return (<framer_motion_1.motion.button key={day} onClick={() => setSelectedDay(day)} className="shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition-all touch-manipulation flex items-center gap-1.5" style={isActive
                    ? { background: 'linear-gradient(135deg, #22c55e, #059669)', color: '#000', boxShadow: '0 0 12px rgba(34,197,94,0.25)' }
                    : { background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', color: '#6b7280' }} whileTap={{ scale: 0.93 }}>
                  {day === 'All' ? 'All' : day.slice(0, 3)}
                  {count > 0 && (<span className="text-[9px] font-black px-1.5 py-0.5 rounded-lg" style={{ background: isActive ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.08)', color: isActive ? '#000' : '#6b7280' }}>
                      {count}
                    </span>)}
                </framer_motion_1.motion.button>);
        })}
          </div>
        </div>
      </div>

      {/* ── CONTENT ─────────────────────────────────────────────────────── */}
      <div className="px-5">
        <framer_motion_1.AnimatePresence mode="wait">
          {filteredClasses.length === 0 ? (<framer_motion_1.motion.div key="empty" initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <EmptyState_1.EmptyState icon={<lucide_react_1.Calendar size={28}/>} title={searchQuery ? 'No matches found' : 'No classes yet'} description={searchQuery ? 'Try a different search term.' : 'Build your timetable by adding your courses.'} action={{ label: 'Add your first class', onClick: () => setShowAddClass(true) }}/>
            </framer_motion_1.motion.div>) : viewMode === 'grid' ? (
        /* ── GRID VIEW ── */
        <framer_motion_1.motion.div key="grid" initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="overflow-x-auto -mx-5 px-5 pb-4 pt-2">
              <div className="min-w-[520px]">
                {/* Day headers */}
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  <div />
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map(d => (<div key={d} className="text-center py-2">
                      <span className="text-xs font-black text-dark-400 uppercase tracking-wider">{d}</span>
                    </div>))}
                </div>
                {/* Time slots */}
                {HOURS.map(hour => (<div key={hour} className="grid grid-cols-6 gap-1.5 mb-1.5 min-h-[48px]">
                    <div className="text-right pr-2 pt-1">
                      <span className="text-[10px] font-mono text-dark-600">
                        {String(hour).padStart(2, '0')}:00
                      </span>
                    </div>
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
                    const cls = semClasses.find(c => c.day === day && parseInt(c.startTime.split(':')[0]) === hour);
                    if (!cls)
                        return (<div key={day} className="rounded-xl" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)' }}/>);
                    const colors = (0, colors_1.getColorClasses)(cls.colorLabel);
                    return (<framer_motion_1.motion.div key={day} className={`rounded-xl p-2 cursor-pointer ${colors.bg} ${colors.border} border`} onClick={() => { setEditingClass(cls); setShowAddClass(true); }} whileTap={{ scale: 0.95 }}>
                          <p className={`text-[9px] font-black truncate ${colors.text}`}>{cls.courseCode}</p>
                          <p className="text-[8px] text-white/60 truncate mt-0.5">{cls.venue}</p>
                        </framer_motion_1.motion.div>);
                })}
                  </div>))}
              </div>
            </framer_motion_1.motion.div>) : (
        /* ── LIST VIEW ── */
        <framer_motion_1.motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6 pb-4 pt-2">
              {Object.entries(classesByDay).map(([day, dayClasses], dayIdx) => (<framer_motion_1.motion.div key={day} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: dayIdx * 0.06, type: 'spring', stiffness: 300 }}>
                  {selectedDay === 'All' && (<div className="flex items-center gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-5 rounded-full bg-green-500"/>
                        <h2 className="text-sm font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{day}</h2>
                      </div>
                      <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }}/>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)', color: '#6b7280' }}>
                        {dayClasses?.length} class{dayClasses?.length !== 1 ? 'es' : ''}
                      </span>
                    </div>)}
                  <div className="space-y-3">
                    {dayClasses?.map((cls, i) => (<framer_motion_1.motion.div key={cls.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                        <ClassCard_1.ClassCard cls={cls} index={i} onEdit={c => { setEditingClass(c); setShowAddClass(true); }} onDelete={handleDelete} onMarkAttendance={(id, attended) => markAttendance(id, attended)}/>
                      </framer_motion_1.motion.div>))}
                  </div>
                </framer_motion_1.motion.div>))}
            </framer_motion_1.motion.div>)}
        </framer_motion_1.AnimatePresence>
      </div>

      <ClassForm_1.ClassForm isOpen={showAddClass} onClose={() => { setShowAddClass(false); setEditingClass(null); }} editClass={editingClass}/>
    </div>);
}
//# sourceMappingURL=Timetable.js.map