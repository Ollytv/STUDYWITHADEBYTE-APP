"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = BottomNav;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const useStore_1 = require("../../hooks/useStore");
const tabs = [
    { id: 'dashboard', icon: lucide_react_1.LayoutDashboard, label: 'Home' },
    { id: 'timetable', icon: lucide_react_1.CalendarDays, label: 'Schedule' },
    { id: 'attendance', icon: lucide_react_1.CheckSquare, label: 'Attend' },
    { id: 'more', icon: lucide_react_1.Grid2X2, label: 'More' },
    { id: 'settings', icon: lucide_react_1.Settings, label: 'Profile' },
];
// ── Nav sizing — single source of truth ─────────────────────────────────────
// These are the exact same numbers already used below (content row height +
// top/bottom padding). Keeping them as constants lets us publish an accurate
// `--bottom-nav-height` CSS variable that other fixed elements (e.g. the AI
// chat input) can read, instead of guessing the nav's height with a magic
// pixel value elsewhere in the app.
const NAV_CONTENT_HEIGHT = 52; // matches each tab button's minHeight
const NAV_PADDING_Y = 8; // top/bottom padding inside the nav (excl. safe-area)
function BottomNav() {
    const { activeTab, setActiveTab } = (0, useStore_1.useStore)();
    return (<nav className="fixed bottom-0 left-0 right-0 z-[55]">
      {/* Publish the nav's true rendered height (including the safe-area
            inset) as a global CSS variable. Purely informational — changes
            nothing visually — so fixed siblings elsewhere in the app can sit
            flush above the nav instead of underneath it. */}
      <style>{`
        :root {
          --bottom-nav-height: calc(${NAV_CONTENT_HEIGHT + NAV_PADDING_Y * 2}px + env(safe-area-inset-bottom, 0px));
        }
      `}</style>
      {/* Frosted glass blur layer */}
      <div className="absolute inset-0 backdrop-blur-2xl" style={{ background: 'rgba(10,10,15,0.85)', borderTop: '1px solid rgba(255,255,255,0.06)' }}/>
      <div className="relative flex items-end justify-around max-w-lg mx-auto px-3" style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_PADDING_Y}px)`, paddingTop: NAV_PADDING_Y }}>
        {tabs.map((tab, idx) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (<framer_motion_1.motion.button key={tab.id} onClick={() => setActiveTab(tab.id)} className="relative flex flex-col items-center gap-1 flex-1 touch-manipulation" style={{ minHeight: NAV_CONTENT_HEIGHT, WebkitTapHighlightColor: 'transparent' }} whileTap={{ scale: 0.82 }} transition={{ type: 'spring', stiffness: 500, damping: 25 }}>
              {/* Active pill background */}
              <framer_motion_1.AnimatePresence>
                {isActive && (<framer_motion_1.motion.div layoutId="nav-pill" className="absolute top-0 inset-x-1 rounded-2xl" style={{ height: 38, background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(5,150,105,0.12))', border: '1px solid rgba(34,197,94,0.2)' }} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}/>)}
              </framer_motion_1.AnimatePresence>

              {/* Icon with dot indicator */}
              <div className="relative mt-1.5 flex items-center justify-center w-7 h-7">
                <Icon size={20} strokeWidth={isActive ? 2.2 : 1.7} className="transition-colors duration-200" style={{ color: isActive ? '#4ade80' : '#4b5563' }}/>
                {/* Active dot above icon */}
                {isActive && (<framer_motion_1.motion.div className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-green-400" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 20 }}/>)}
              </div>

              <span className="text-[9px] font-semibold tracking-wide transition-colors duration-200" style={{
                    color: isActive ? '#4ade80' : '#4b5563',
                    fontFamily: 'system-ui, sans-serif',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                }}>
                {tab.label}
              </span>
            </framer_motion_1.motion.button>);
        })}
      </div>
    </nav>);
}
//# sourceMappingURL=BottomNav.js.map