// src/pages/AuthScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { Mail, Lock, User, Eye, EyeOff, Sparkles, ArrowRight, RotateCcw } from 'lucide-react';
import { useStore } from '../hooks/useStore';
import { resetPassword } from '../services/auth';

type Mode = 'login' | 'signup' | 'reset';

function Field({
  label, type = 'text', value, onChange, placeholder, icon, right
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string;
  icon: React.ReactNode; right?: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-body font-semibold text-dark-400 uppercase tracking-wider mb-1.5">{label}</p>
      <div className="flex items-center gap-3 bg-dark-800 border border-white/8 rounded-2xl px-4 py-3.5 focus-within:border-green-500/40 transition-colors">
        <span className="text-dark-500 flex-shrink-0">{icon}</span>
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-sm font-body text-white placeholder:text-dark-600 focus:outline-none"
          autoCapitalize="none"
          autoCorrect="off"
        />
        {right}
      </div>
    </div>
  );
}

export default function AuthScreen() {
  const { signUp, signIn, authError, clearAuthError } = useStore();

  const [mode, setMode]         = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [localError, setLocalError] = useState('');

  const error = localError || authError;

  const switchMode = (m: Mode) => {
    setMode(m);
    clearAuthError();
    setLocalError('');
    setResetSent(false);
  };

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const validate = (): string => {
  // Length limits prevent DoS via extremely long inputs
  if (mode === 'signup' && !fullName.trim())
    return 'Please enter your full name.';
  if (mode === 'signup' && fullName.trim().length > 100)
    return 'Name must be under 100 characters.';
  if (!email.trim())
    return 'Please enter your email address.';
  if (email.length > 254)  // RFC 5321 maximum email length
    return 'Email address is too long.';
  if (!EMAIL_REGEX.test(email.trim()))
    return 'Please enter a valid email address.';
  if (mode !== 'reset' && password.length < 8)
    return 'Password must be at least 8 characters.';
  if (mode !== 'reset' && password.length > 128)
    return 'Password must be under 128 characters.';
  return '';
};

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setLocalError(err); return; }
    setLocalError('');
    setLoading(true);
    try {
      if (mode === 'signup') {
        await signUp(email.trim(), password, fullName.trim());
      } else if (mode === 'login') {
        await signIn(email.trim(), password);
      } else {
        await resetPassword(email.trim());
        setResetSent(true);
      }
    } catch (_) {
      // Error already set in store
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <motion.div
      className="min-h-screen bg-dark-950 flex flex-col px-6 pt-16 pb-10"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-16 h-16 rounded-3xl bg-green-500/15 border border-green-500/25 flex items-center justify-center mb-4">
          <Sparkles size={28} className="text-green-400" />
        </div>
        <h1 className="text-2xl font-display font-bold text-white">StudyWithAdebyte</h1>
        <p className="text-xs font-body text-dark-400 mt-1">Student Academic Companion</p>
      </div>

      {/* Tab switcher (login / signup) */}
      {mode !== 'reset' && (
        <div className="flex bg-dark-800 rounded-2xl p-1 mb-6 border border-white/5">
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`flex-1 py-2.5 rounded-xl text-sm font-display font-semibold transition-all touch-manipulation ${
                mode === m
                  ? 'bg-green-500 text-dark-950 shadow-sm'
                  : 'text-dark-400 hover:text-white'
              }`}
            >
              {m === 'login' ? 'Log In' : 'Sign Up'}
            </button>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col gap-4"
          onKeyDown={handleKeyDown}
        >
          {mode === 'reset' ? (
            <>
              <div className="text-center mb-2">
                <h2 className="text-lg font-display font-bold text-white">Reset Password</h2>
                <p className="text-xs font-body text-dark-400 mt-1">
                  Enter your email and we'll send a reset link.
                </p>
              </div>
              {resetSent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-4 rounded-2xl bg-green-500/12 border border-green-500/25 text-center"
                >
                  <p className="text-sm font-body text-green-400">
                    ✅ Reset link sent to <strong>{email}</strong>. Check your inbox.
                  </p>
                </motion.div>
              ) : (
                <Field label="Email" type="email" value={email} onChange={setEmail}
                  placeholder="your@email.com" icon={<Mail size={16} />} />
              )}
            </>
          ) : (
            <>
              {mode === 'signup' && (
                <Field label="Full Name" value={fullName} onChange={setFullName}
                  placeholder="e.g. Adebayo Johnson" icon={<User size={16} />} />
              )}
              <Field label="Email" type="email" value={email} onChange={setEmail}
                placeholder="your@email.com" icon={<Mail size={16} />} />
              <Field
                label="Password" type={showPw ? 'text' : 'password'}
                value={password} onChange={setPassword}
                placeholder={mode === 'signup' ? 'At least 6 characters' : 'Your password'}
                icon={<Lock size={16} />}
                right={
                  <button onClick={() => setShowPw(p => !p)} className="text-dark-500 hover:text-white transition-colors touch-manipulation">
                    {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />
            </>
          )}

          {/* Error */}
          {error && !resetSent && (
            <motion.p
              initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="text-xs text-red-400 font-body text-center"
            >{error}</motion.p>
          )}

          {/* Submit */}
          {!resetSent && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full py-4 rounded-2xl bg-green-500 text-dark-950 font-display font-bold text-base
                         flex items-center justify-center gap-2 disabled:opacity-50
                         touch-manipulation active:scale-[0.98] transition-transform mt-2"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-4 h-4 border-2 border-dark-950 border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                  />
                  {mode === 'signup' ? 'Creating account…' : mode === 'login' ? 'Logging in…' : 'Sending…'}
                </span>
              ) : (
                <>
                  {mode === 'signup' ? 'Create Account' : mode === 'login' ? 'Log In' : 'Send Reset Link'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          )}

          {/* Footer links */}
          <div className="flex flex-col items-center gap-2 mt-2">
            {mode === 'login' && (
              <button
                onClick={() => switchMode('reset')}
                className="text-xs font-body text-dark-400 hover:text-green-400 transition-colors touch-manipulation"
              >
                Forgot password?
              </button>
            )}
            {mode === 'reset' && (
              <button
                onClick={() => switchMode('login')}
                className="text-xs font-body text-dark-400 hover:text-white transition-colors flex items-center gap-1 touch-manipulation"
              >
                <RotateCcw size={12} /> Back to login
              </button>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="text-center text-xs text-dark-600 font-body mt-auto pt-8">
        Made with 💚 for POLYIBADAN students
      </p>
    </motion.div>
  );
}
