"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SemesterSwitcher = SemesterSwitcher;
const useStore_1 = require("../../hooks/useStore");
const framer_motion_1 = require("framer-motion");
function SemesterSwitcher() {
    const { activeSemester, setActiveSemester, activeAcademicYear, setActiveAcademicYear } = (0, useStore_1.useStore)();
    const years = Array.from({ length: 4 }, (_, i) => {
        const y = new Date().getFullYear() - i;
        return `${y}/${y + 1}`;
    });
    return (<div className="flex items-center gap-2 px-4 pb-3">
      <div className="flex items-center bg-dark-800 border border-white/5 rounded-2xl p-1 gap-1">
        {['First', 'Second'].map(s => (<framer_motion_1.motion.button key={s} onClick={() => setActiveSemester(s)} className={`px-4 py-1.5 rounded-xl text-xs font-body font-semibold transition-all ${activeSemester === s ? 'bg-green-500 text-dark-950 shadow-green-glow' : 'text-dark-400'}`} whileTap={{ scale: 0.95 }}>
            {s}
          </framer_motion_1.motion.button>))}
      </div>
      <select value={activeAcademicYear} onChange={e => setActiveAcademicYear(e.target.value)} className="flex-1 bg-dark-800 border border-white/5 rounded-2xl text-xs font-mono text-dark-300 px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500/40 appearance-none">
        {years.map(y => <option key={y} value={y} className="bg-dark-800">{y}</option>)}
      </select>
    </div>);
}
//# sourceMappingURL=SemesterSwitcher.js.map