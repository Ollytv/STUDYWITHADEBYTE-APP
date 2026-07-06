import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, CalendarDays, CheckSquare, Grid2X2, Settings } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ROUTES } from '../../routes';

const tabs = [
  { to: ROUTES.app.root,       icon: LayoutDashboard, label: 'Home' },
  { to: ROUTES.app.timetable,  icon: CalendarDays,    label: 'Schedule' },
  { to: ROUTES.app.attendance, icon: CheckSquare,     label: 'Attend' },
  { to: ROUTES.app.more,       icon: Grid2X2,         label: 'More' },
  { to: ROUTES.app.settings,   icon: Settings,        label: 'Profile' },
] as const;

const NAV_CONTENT_HEIGHT = 52;
const NAV_PADDING_Y      = 8;

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[55]">
      <style>{`
        :root {
          --bottom-nav-height: calc(${NAV_CONTENT_HEIGHT + NAV_PADDING_Y * 2}px + env(safe-area-inset-bottom, 0px));
        }
      `}</style>
      <div className="absolute inset-0 backdrop-blur-2xl"
        style={{ background: 'rgba(10,10,15,0.85)', borderTop: '1px solid rgba(255,255,255,0.06)' }}
      />
      <div className="relative flex items-end justify-around max-w-lg mx-auto px-3"
        style={{ paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + ${NAV_PADDING_Y}px)`, paddingTop: NAV_PADDING_Y }}
      >
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = location.pathname === tab.to;

          return (
            <motion.button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              className="relative flex flex-col items-center gap-1 flex-1 touch-manipulation"
              style={{ minHeight: NAV_CONTENT_HEIGHT, WebkitTapHighlightColor: 'transparent' }}
              whileTap={{ scale: 0.82 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              <AnimatePresence>
                {isActive && (
                  <motion.div
                    layoutId="nav-pill"
                    className="absolute top-0 inset-x-1 rounded-2xl"
                    style={{ height: 38, background: 'linear-gradient(135deg, rgba(34,197,94,0.2), rgba(5,150,105,0.12))', border: '1px solid rgba(34,197,94,0.2)' }}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', bounce: 0.3, duration: 0.4 }}
                  />
                )}
              </AnimatePresence>

              <div className="relative mt-1.5 flex items-center justify-center w-7 h-7">
                <Icon
                  size={20}
                  strokeWidth={isActive ? 2.2 : 1.7}
                  className="transition-colors duration-200"
                  style={{ color: isActive ? '#4ade80' : '#4b5563' }}
                />
                {isActive && (
                  <motion.div
                    className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-green-400"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 600, damping: 20 }}
                  />
                )}
              </div>

              <span
                className="text-[9px] font-semibold tracking-wide transition-colors duration-200"
                style={{
                  color: isActive ? '#4ade80' : '#4b5563',
                  fontFamily: 'system-ui, sans-serif',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}