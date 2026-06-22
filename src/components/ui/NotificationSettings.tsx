// src/components/ui/NotificationSettings.tsx
//
// Drop-in section for your Settings page.
// Handles permission request, toggle switches for each lead-time option,
// and a live "Test Sound" button so users can confirm audio works.
//
// Usage in Settings.tsx:
//   import { NotificationSettings } from '../components/ui/NotificationSettings';
//   <NotificationSettings />

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Bell, BellOff, Volume2, CheckCircle, AlertTriangle } from 'lucide-react';
import { useStore } from '../../hooks/useStore';
import { useNotifications } from '../../hooks/useNotifications';
import { playAlertSound } from '../../services/notificationService';

export function NotificationSettings() {
  const { settings, updateSettings } = useStore();
  const { permissionState, requestPermission } = useNotifications();
  const [requesting, setRequesting] = useState(false);
  const [testPlayed, setTestPlayed] = useState(false);

  const notifs = settings?.notifications;
  if (!notifs) return null;

  const isGranted = permissionState === 'granted';
  const isDenied  = permissionState === 'denied';

  const handleToggleEnabled = async () => {
    if (!isGranted && !notifs.enabled) {
      // First time — request permission then enable
      setRequesting(true);
      await requestPermission();
      setRequesting(false);
    } else {
      await updateSettings({
        notifications: { ...notifs, enabled: !notifs.enabled },
      });
    }
  };

  const handleToggle = async (key: keyof typeof notifs) => {
    await updateSettings({
      notifications: { ...notifs, [key]: !notifs[key] },
    });
  };

  const handleTestSound = () => {
    playAlertSound();
    setTestPlayed(true);
    setTimeout(() => setTestPlayed(false), 2000);
  };

  return (
    <div className="space-y-3">

      {/* Section header */}
      <div className="flex items-center gap-2 px-1 mb-3">
        <Bell size={14} className="text-green-400" />
        <span className="text-xs font-black text-green-400/80 uppercase tracking-widest">
          Class Notifications
        </span>
      </div>

      {/* Permission denied warning */}
      {isDenied && (
        <motion.div
          className="flex items-start gap-3 p-3 rounded-xl"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
        >
          <AlertTriangle size={14} className="text-yellow-400 mt-0.5 shrink-0" />
          <p className="text-xs text-yellow-300">
            Notifications are blocked by your browser. To enable them, click the
            lock icon in your address bar and allow notifications for this site.
          </p>
        </motion.div>
      )}

      {/* Main enable toggle */}
      <div
        className="flex items-center justify-between p-4 rounded-2xl"
        style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{
              background: notifs.enabled ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.05)',
              border: notifs.enabled ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.1)',
            }}
          >
            {notifs.enabled
              ? <Bell size={16} className="text-green-400" />
              : <BellOff size={16} className="text-dark-500" />
            }
          </div>
          <div>
            <p className="text-sm font-bold text-white">Enable notifications</p>
            <p className="text-xs text-dark-500 mt-0.5">
              {isGranted ? 'Permission granted ✓' : 'Tap to request permission'}
            </p>
          </div>
        </div>
        <button
          onClick={handleToggleEnabled}
          disabled={requesting || isDenied}
          className="relative w-12 h-6 rounded-full transition-all duration-300 shrink-0"
          style={{
            background: notifs.enabled ? 'rgba(34,197,94,0.8)' : 'rgba(255,255,255,0.1)',
            opacity: isDenied ? 0.4 : 1,
          }}
        >
          <motion.div
            className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
            animate={{ left: notifs.enabled ? 'calc(100% - 20px)' : '4px' }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>
      </div>

      {/* Lead-time options — only shown when notifications are enabled */}
      {notifs.enabled && (
        <motion.div
          className="space-y-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
        >
          <p className="text-[10px] font-black text-dark-500 uppercase tracking-widest px-1 pt-1">
            Alert me before class
          </p>

          {[
            { key: 'tenMinsBefore',    label: '10 minutes before' },
            { key: 'thirtyMinsBefore', label: '30 minutes before' },
            { key: 'oneHourBefore',    label: '1 hour before'     },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between px-4 py-3 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
            >
              <span className="text-sm text-dark-300">{label}</span>
              <button
                onClick={() => handleToggle(key as keyof typeof notifs)}
                className="relative w-10 h-5 rounded-full transition-all duration-300"
                style={{
                  background: notifs[key as keyof typeof notifs]
                    ? 'rgba(34,197,94,0.7)'
                    : 'rgba(255,255,255,0.08)',
                }}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: notifs[key as keyof typeof notifs] ? 'calc(100% - 18px)' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          ))}

          {/* Sound toggle */}
          <div
            className="flex items-center justify-between px-4 py-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}
          >
            <div className="flex items-center gap-2">
              <Volume2 size={13} className="text-dark-400" />
              <span className="text-sm text-dark-300">Sound alert</span>
            </div>
            <div className="flex items-center gap-3">
              {/* Test sound button */}
              <button
                onClick={handleTestSound}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all"
                style={{
                  background: testPlayed ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)',
                  color: testPlayed ? '#4ade80' : '#6b7280',
                  border: testPlayed ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {testPlayed ? '✓ Played' : 'Test'}
              </button>
              <button
                onClick={() => handleToggle('sound')}
                className="relative w-10 h-5 rounded-full transition-all duration-300"
                style={{
                  background: notifs.sound ? 'rgba(34,197,94,0.7)' : 'rgba(255,255,255,0.08)',
                }}
              >
                <motion.div
                  className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow"
                  animate={{ left: notifs.sound ? 'calc(100% - 18px)' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>

          {/* "Notify when class starts" is always on — informational */}
          <p className="text-[10px] text-dark-600 px-1 pt-1">
            You'll always be notified at class start time, regardless of the options above.
          </p>
        </motion.div>
      )}
    </div>
  );
}
