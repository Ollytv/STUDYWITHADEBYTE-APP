import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { BookOpen, CalendarDays, CheckCircle, Bell, ArrowRight, Sparkles } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ProgramLevel, PROGRAM_LEVEL_META, DEFAULT_PROGRAM_LEVEL } from '../types';
import { requestNotificationPermission } from '../services/notifications';

const DEPARTMENTS = [
  'Computer Science','Business Administration','Accountancy',
  'Electrical/Electronics Engineering','Mechanical Engineering','Civil Engineering',
  'Mass Communication','Public Administration','Marketing','Banking & Finance',
  'Science Laboratory Technology','Statistics','Architecture','Quantity Surveying','Other',
];
// Derived from PROGRAM_LEVEL_META — adding a level in index.ts
// automatically appears here. No manual sync needed.
const LEVEL_OPTIONS = PROGRAM_LEVEL_META.map(m => ({ value: m.value, label: m.label }));

const slides = [
  { icon: BookOpen,    title: 'Welcome to\nSTUDIBYTE', sub: 'Your all-in-one smart academic companion built for students.', color: 'from-green-500/20 to-emerald-600/10', accent: '#22c55e', iconBg: 'rgba(34,197,94,0.12)',   iconBorder: 'rgba(34,197,94,0.25)' },
  { icon: CalendarDays,title: 'Smart Timetable\nManagement',    sub: 'Add courses manually or import from PDF, Word, or screenshot automatically.', color: 'from-blue-500/15 to-cyan-600/5',     accent: '#3b82f6', iconBg: 'rgba(59,130,246,0.12)',  iconBorder: 'rgba(59,130,246,0.25)' },
  { icon: CheckCircle, title: 'Track Attendance\n& GPA',         sub: "Mark classes attended or missed. Calculate your GPA. Never fall below 75%.", color: 'from-purple-500/15 to-violet-600/5',  accent: '#a855f7', iconBg: 'rgba(168,85,247,0.12)', iconBorder: 'rgba(168,85,247,0.25)' },
  { icon: Bell,        title: 'Stay on Top\nof Everything',      sub: 'Assignments, study timer, class reminders — all in one premium app.', color: 'from-orange-500/15 to-amber-600/5',   accent: '#f97316', iconBg: 'rgba(249,115,22,0.12)',  iconBorder: 'rgba(249,115,22,0.25)' },
];

export default function Onboarding() {
  const { updateSettings, saveProfile } = useStore();

  const [step, setStep]             = useState(0);
  const [profileStep, setProfileStep] = useState(false);
  const [saving, setSaving]         = useState(false);

  const [fullName, setFullName]         = useState('');
  const [department, setDepartment]     = useState('');
  const [programLevel, setProgramLevel] = useState<ProgramLevel>(DEFAULT_PROGRAM_LEVEL);
  const [formError, setFormError]       = useState('');

  const isLast = step === slides.length - 1;
  const slide  = slides[step];
  const Icon   = slide.icon;

  // ── The ONE function that finishes onboarding ──────────────────────────────
  // Called by both "Let's go!" and "Skip for now"
  // withProfile=true  → save the form data first
  // withProfile=false → skip saving, just unlock
  const finish = async () => {
    if (saving) return; // prevent double-tap

    // ── Validation — both fields required ──────────────────────────────────
    if (!fullName.trim()) {
      setFormError('Please enter your full name to continue.');
      return;
    }
    if (!department) {
      setFormError('Please select your department to continue.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      await saveProfile({
          fullName: fullName.trim(),
          department,
          programLevel,
          matricNumber: '',
          semesterStartDate: new Date().toISOString().split('T')[0],
          semesterEndDate: '',
          targetAttendance: 75,
          currentSemester: 'First',
          currentAcademicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
          avatar: '',
        });

      // Non-blocking — don't let notification errors trap the user
      requestNotificationPermission().catch(() => {});

      // This is the ONLY call that matters for routing.
      // updateSettings now: (1) updates Zustand sync, (2) patches localStorage directly,
      // (3) writes to IndexedDB in background.
      // App.tsx reads settings.onboardingComplete reactively → immediately shows Dashboard.
      await updateSettings({
        onboardingComplete: true,
        firstLaunch: false,
        notifications: {
          enabled: Notification.permission === 'granted',
          tenMinsBefore: true,
          thirtyMinsBefore: true,
          oneHourBefore: false,
          sound: true,
        },
      });
    } catch (e) {
      console.error('Onboarding error:', e);
      // Even on error, force unlock so the user is never permanently stuck
      await updateSettings({ onboardingComplete: true, firstLaunch: false }).catch(() => {});    } finally {
      setSaving(false);
    }
  };

  // ── Profile setup screen ───────────────────────────────────────────────────
  if (profileStep) {
    return (
      <motion.div
        className="min-h-screen bg-dark-950 flex flex-col px-6 pt-14 pb-safe"
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
      >
        <div className="mb-8">
          <div className="w-12 h-12 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-5">
            <Sparkles size={22} className="text-green-400" />
          </div>
          <h1 className="text-3xl font-display font-bold text-white leading-tight mb-2">
            Set up your<br />profile
          </h1>
          <p className="text-sm font-body text-dark-400 leading-relaxed">
            Personalize your experience. You can always update this in Settings.
          </p>
        </div>

        <div className="flex-1 space-y-5">
          <Input
            label="Full Name"
            value={fullName}
            onChange={v => { setFullName(v); setFormError(''); }}
            placeholder="e.g. Adebayo Johnson"
          />
          <Select
            label="Department"
            value={department}
            onChange={v => { setDepartment(v); setFormError(''); }}
            options={[
              { value: '', label: 'Select your department...' },
              ...DEPARTMENTS.map(d => ({ value: d, label: d })),
            ]}
          />
          <Select
            label="Academic Level"
            value={programLevel}
            onChange={v => setProgramLevel(v as ProgramLevel)}
            options={LEVEL_OPTIONS}
          />
        </div>

        <div className="space-y-3 mt-8 pb-8">
          {/* Inline validation error */}
          {formError && (
            <motion.p
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 font-body text-center pb-1"
            >
              {formError}
            </motion.p>
          )}

          {/* Let's go — requires name + department */}
          <button
            onClick={finish}
            disabled={saving}
            className="w-full py-4 rounded-2xl bg-green-500 text-dark-950 font-display font-bold text-base
                       disabled:opacity-50 transition-opacity touch-manipulation active:scale-[0.98]"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            {saving ? 'Setting up…' : "Let's go! 🚀"}
          </button>
        </div>
      </motion.div>
    );
  }

  // ── Intro slides ───────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-dark-950 flex flex-col overflow-hidden">
      <div className={`absolute inset-0 bg-gradient-to-br ${slide.color} opacity-50 transition-all duration-700`} />
      <div className="relative flex flex-col min-h-screen px-6 pt-14 pb-safe">

        {/* Skip straight to profile setup */}
        <button
          onClick={() => setProfileStep(true)}
          className="self-end mb-4 px-4 py-2 text-sm font-body text-dark-400 hover:text-white transition-colors touch-manipulation"
          style={{ WebkitTapHighlightColor: 'transparent', minWidth: 60, minHeight: 44 }}
        >
          Skip
        </button>

        {/* Slide */}
        <div className="flex-1 flex flex-col items-center justify-center text-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-24 h-24 rounded-3xl border-2 flex items-center justify-center mb-8"
                style={{ background: slide.iconBg, borderColor: slide.iconBorder }}
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Icon size={44} style={{ color: slide.accent }} />
              </motion.div>
              <h1 className="text-3xl font-display font-bold text-white leading-tight whitespace-pre-line mb-4">
                {slide.title}
              </h1>
              <p className="text-dark-300 font-body text-base leading-relaxed max-w-xs">
                {slide.sub}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {slides.map((_, i) => (
            <motion.div
              key={i}
              onClick={() => setStep(i)}
              className="rounded-full cursor-pointer"
              animate={{ width: i === step ? 24 : 8, height: 8, background: i === step ? '#22c55e' : '#333' }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>

        <button
          onClick={() => isLast ? setProfileStep(true) : setStep(s => s + 1)}
          className="w-full py-4 rounded-2xl bg-green-500 text-dark-950 font-display font-bold text-base
                     flex items-center justify-center gap-2 touch-manipulation active:scale-[0.98] transition-transform"
          style={{ WebkitTapHighlightColor: 'transparent' }}
        >
          {isLast ? 'Get Started 🎉' : 'Next'}
          {!isLast && <ArrowRight size={18} />}
        </button>
        <div className="h-8" />
      </div>
    </div>
  );
}