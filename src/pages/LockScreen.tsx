import { motion } from 'framer-motion';
import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import { Lock, Sparkles } from 'lucide-react';

function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex items-center justify-center gap-4 my-8">
      {Array.from({ length }).map((_, i) => (
        <motion.div key={i}
          className={`w-4 h-4 rounded-full border-2 transition-colors ${i < filled ? 'bg-green-400 border-green-400' : 'bg-transparent border-dark-500'}`}
          animate={{ scale: i === filled - 1 ? [1, 1.3, 1] : 1 }}
          transition={{ duration: 0.15 }}
        />
      ))}
    </div>
  );
}

function PinPad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div className="grid grid-cols-3 gap-3 px-6">
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <motion.button key={k}
          onClick={() => k === '⌫' ? onDelete() : onDigit(k)}
          className={`h-16 rounded-2xl text-xl font-display font-semibold flex items-center justify-center touch-manipulation
            ${k === '⌫' ? 'bg-dark-800 text-dark-300' : 'bg-dark-800 border border-white/8 text-white active:bg-green-500/20'}`}
          whileTap={{ scale: 0.92 }}
        >{k}</motion.button>
      ))}
    </div>
  );
}

export default function LockScreen() {
  const { settings, profile, updateSettings } = useStore();
  const hasPin = !!(settings as any).pin;

  const [pin, setPin]         = useState('');
  const [error, setError]     = useState('');
  const [shaking, setShaking] = useState(false);

  // ── No PIN set → show name/department confirmation ────────────────────────
  const [nameInput, setNameInput] = useState('');
  const [unlocking, setUnlocking] = useState(false);

  const shake = () => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  const unlock = async () => {
    await updateSettings({ onboardingComplete: true });
  };

  // ── PIN flow ──────────────────────────────────────────────────────────────
  const handleDigit = (d: string) => {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError('');
    if (next.length === 4) {
      setTimeout(() => {
        if (next === (settings as any).pin) {
          unlock();
        } else {
          shake();
          setError('Incorrect PIN. Try again.');
          setPin('');
        }
      }, 120);
    }
  };

  const handleDelete = () => {
    setPin(p => p.slice(0, -1));
    setError('');
  };

  // ── No-PIN flow (name confirmation) ───────────────────────────────────────
  const handleNameUnlock = async () => {
    const saved = profile?.fullName?.trim().toLowerCase() || '';
    const entered = nameInput.trim().toLowerCase();
    if (!saved) {
      // No profile saved at all — just let them back in
      await unlock();
      return;
    }
    if (entered === saved) {
      await unlock();
    } else {
      shake();
      setError('Name does not match. Try again.');
      setNameInput('');
    }
  };

  const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';

  return (
    <motion.div
      className="min-h-screen bg-dark-950 flex flex-col"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="flex flex-col items-center pt-20 pb-6 px-6">
        <div className="w-14 h-14 rounded-2xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-4">
          <Sparkles size={24} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white mb-1">StudyWithAdebyte</h1>
        <p className="text-sm font-body text-dark-400">Welcome back</p>

        {/* Avatar */}
        <div className="mt-6 w-20 h-20 rounded-3xl overflow-hidden border-2 border-green-500/30">
          {profile?.avatar ? (
            <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
              <span className="text-2xl font-display font-bold text-dark-950">{initials}</span>
            </div>
          )}
        </div>
        {profile?.fullName && (
          <p className="mt-3 text-base font-display font-semibold text-white">{profile.fullName}</p>
        )}
        {profile?.programLevel && (
          <p className="text-xs font-body text-dark-400 mt-0.5">{profile.department} • {profile.programLevel}</p>
        )}
      </div>

      {/* PIN entry */}
      {hasPin ? (
        <motion.div
          animate={shaking ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col"
        >
          <p className="text-center text-sm font-body text-dark-400">Enter your PIN</p>
          <PinDots length={4} filled={pin.length} />
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-red-400 font-body mb-4">{error}</motion.p>
          )}
          <PinPad onDigit={handleDigit} onDelete={handleDelete} />
        </motion.div>
      ) : (
        /* Name confirmation */
        <motion.div
          animate={shaking ? { x: [-8, 8, -8, 8, 0] } : { x: 0 }}
          transition={{ duration: 0.4 }}
          className="flex-1 flex flex-col px-6 gap-4"
        >
          <p className="text-center text-sm font-body text-dark-400">
            Enter your full name to unlock
          </p>
          <div className="flex items-center gap-3 bg-dark-800 border border-white/8 rounded-2xl px-4 py-3.5">
            <Lock size={16} className="text-dark-500 flex-shrink-0" />
            <input
              type="text"
              value={nameInput}
              onChange={e => { setNameInput(e.target.value); setError(''); }}
              onKeyDown={e => e.key === 'Enter' && handleNameUnlock()}
              placeholder="e.g. Adebayo Johnson"
              className="flex-1 bg-transparent text-sm font-body text-white placeholder:text-dark-600 focus:outline-none"
              autoFocus
            />
          </div>
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-center text-xs text-red-400 font-body">{error}</motion.p>
          )}
          <button
            onClick={handleNameUnlock}
            disabled={!nameInput.trim()}
            className="w-full py-4 rounded-2xl bg-green-500 text-dark-950 font-display font-bold text-base disabled:opacity-40 transition-opacity touch-manipulation"
          >
            Unlock
          </button>
        </motion.div>
      )}

      <p className="text-center text-xs text-dark-600 font-body pb-10 mt-8">
        Made with 💚 for POLYIBADAN students
      </p>
    </motion.div>
  );
}
