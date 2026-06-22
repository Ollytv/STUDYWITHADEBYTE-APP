// src/components/ui/NotificationAlert.tsx
//
// In-app alert popup that slides in from the top when a class is about to start.
// Matches the StudiByte emerald/dark design system.
// Rendered once inside App.tsx — always mounted, controlled by the
// useNotifications hook's `alert` state.

import { motion, AnimatePresence } from 'framer-motion';
import { Bell, MapPin, Clock, X } from 'lucide-react';
import { ClassAlertPayload } from '../../services/notificationService';

interface NotificationAlertProps {
  visible:  boolean;
  payload:  ClassAlertPayload | null;
  onDismiss: () => void;
}

export function NotificationAlert({ visible, payload, onDismiss }: NotificationAlertProps) {
  if (!payload) return null;

  const isNow      = payload.leadMins === 0;
  const leadLabel  = isNow
    ? 'Starting now!'
    : `In ${payload.leadMins} minute${payload.leadMins > 1 ? 's' : ''}`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          // Sits above everything — z-[70] is above modals (z-[60]) and nav (z-[55])
          className="fixed top-0 left-0 right-0 z-[70] flex justify-center px-4 pt-safe"
          style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0,    opacity: 1 }}
          exit={{   y: -120, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        >
          <div
            className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl"
            style={{
              background: 'linear-gradient(135deg, #0f1f10, #111b11)',
              border: isNow
                ? '1px solid rgba(34,197,94,0.5)'
                : '1px solid rgba(34,197,94,0.25)',
              boxShadow: isNow
                ? '0 8px 32px rgba(34,197,94,0.25), 0 2px 8px rgba(0,0,0,0.6)'
                : '0 8px 32px rgba(0,0,0,0.5)',
            }}
          >
            {/* Glow bar at top */}
            <div
              className="h-0.5 w-full"
              style={{
                background: isNow
                  ? 'linear-gradient(90deg, #22c55e, #4ade80, #22c55e)'
                  : 'linear-gradient(90deg, rgba(34,197,94,0.4), rgba(74,222,128,0.6), rgba(34,197,94,0.4))',
              }}
            />

            <div className="flex items-start gap-3 px-4 py-3.5">
              {/* Bell icon */}
              <div
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center mt-0.5"
                style={{
                  background: isNow ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                  border: '1px solid rgba(34,197,94,0.3)',
                }}
              >
                <motion.div
                  animate={isNow ? { rotate: [0, -15, 15, -15, 15, 0] } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <Bell size={16} className="text-green-400" />
                </motion.div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Lead time badge */}
                <div className="flex items-center gap-1.5 mb-1">
                  <span
                    className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{
                      background: isNow ? 'rgba(34,197,94,0.2)' : 'rgba(34,197,94,0.1)',
                      color: isNow ? '#4ade80' : '#86efac',
                    }}
                  >
                    {leadLabel}
                  </span>
                </div>

                {/* Course name */}
                <p className="text-sm font-black text-white leading-tight truncate">
                  {payload.courseName}
                </p>
                <p className="text-xs font-mono text-green-400/80 mt-0.5">
                  {payload.courseCode}
                </p>

                {/* Venue + time row */}
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-[10px] text-dark-400">
                    <Clock size={10} />
                    {payload.startTime}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-dark-400 truncate">
                    <MapPin size={10} />
                    {payload.venue}
                  </span>
                </div>
              </div>

              {/* Dismiss button */}
              <button
                onClick={onDismiss}
                className="shrink-0 p-1.5 rounded-lg transition-colors"
                style={{ color: '#4b5563' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4b5563')}
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
