// src/pages/AuthScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useStore } from '../hooks/useStore';
import {
  Mail, Lock, User, Eye, EyeOff, Sparkles,
  Brain, TrendingUp, Bell, Shield, ChevronRight,
  BookOpen, CheckCircle, ArrowLeft,
} from 'lucide-react';

// ── Tiny input ────────────────────────────────────────────────────────────────
function AuthInput({
  label, type = 'text', value, onChange, placeholder, icon: Icon,
  rightSlot, error, hint,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  icon: any; rightSlot?: React.ReactNode; error?: string; hint?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-bold text-dark-400 uppercase tracking-wider">{label}</label>
      <div className={`flex items-center bg-dark-800 border rounded-xl px-3 gap-2 transition-colors
        ${error ? 'border-red-500/50' : 'border-white/8 focus-within:border-green-500/40'}`}>
        <Icon size={14} className="text-dark-500 flex-shrink-0" />
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm font-body py-3 outline-none placeholder-dark-600 min-w-0"
          style={{ boxSizing: 'border-box' }}
        />
        {rightSlot}
      </div>
      {error && <p className="text-[10px] text-red-400 font-body">{error}</p>}
      {hint && !error && <p className="text-[10px] text-dark-600 font-body">{hint}</p>}
    </div>
  );
}

// ── Feature pill for the info panel ──────────────────────────────────────────
function FeaturePill({ icon: Icon, label, color }: { icon: any; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
      style={{ background: `${color}10`, border: `1px solid ${color}20` }}>
      <Icon size={12} style={{ color }} />
      <span className="text-xs font-semibold font-body" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const { signIn, signUp, resetPassword } = useStore();

  const [mode, setMode]               = useState<'login' | 'signup' | 'reset'>('login');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');

  const [loading, setLoading]         = useState(false);
  const [success, setSuccess]         = useState('');
  const [errors, setErrors]           = useState<Record<string, string>>({});
  const [globalErr, setGlobalErr]     = useState('');

  const clearErrors = () => { setErrors({}); setGlobalErr(''); setSuccess(''); };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (mode === 'signup' && !fullName.trim()) e.fullName = 'Full name is required.';
    if (!email.trim())                         e.email    = 'Email address is required.';
    if (mode !== 'reset' && !password)         e.password = 'Password is required.';
    if (mode !== 'reset' && password.length < 8 && password)
                                               e.password = 'Password must be at least 8 characters.';
    if (mode === 'signup' && password !== confirm)
                                               e.confirm  = 'Passwords do not match.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    clearErrors();
    if (!validate()) return;
    setLoading(true);
    try {
      if (mode === 'login') {
        await signIn(email, password);
      } else if (mode === 'signup') {
        await signUp(email, password, fullName);
      } else {
        await resetPassword(email);
        setSuccess('Reset email sent. Check your inbox.');
      }
    } catch (err: any) {
      const msg = err?.message || '';
      const mapped =
        msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')
          ? 'Incorrect email or password.' :
        msg.includes('email-already-in-use')
          ? 'An account with this email already exists.' :
        msg.includes('weak-password')
          ? 'Choose a stronger password (at least 8 characters).' :
        msg.includes('too-many-requests')
          ? 'Too many attempts. Wait a few minutes and try again.' :
        msg || 'Something went wrong. Please try again.';
      setGlobalErr(mapped);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit();
  };

  const switchMode = (m: 'login' | 'signup' | 'reset') => {
    clearErrors();
    setMode(m);
    setPassword('');
    setConfirm('');
  };

  const title    = mode === 'login' ? 'Welcome back' : mode === 'signup' ? 'Create your account' : 'Reset password';
  const subtitle = mode === 'login' ? 'Sign in to continue studying' : mode === 'signup' ? 'Join thousands of students on StudiByte' : 'We\'ll send a reset link to your email';
  const btnLabel = mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link';

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">

      {/* ── INFO PANEL — top of screen on mobile ─────────────────────────── */}
      <div className="relative overflow-hidden px-5 pt-14 pb-7"
        style={{ background: 'linear-gradient(160deg, rgba(34,197,94,0.08) 0%, rgba(168,85,247,0.05) 60%, transparent 100%)' }}>
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10 pointer-events-none"
          style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }} />

        {/* Logo */}
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center">
            <Sparkles size={15} className="text-dark-950" />
          </div>
          <span className="text-base font-black text-white font-display">StudiByte</span>
        </div>

        {mode === 'login' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">AI-Powered Academic Platform</p>
            <h2 className="text-xl font-black text-white font-display mb-3" style={{ letterSpacing: '-0.5px' }}>
              Everything you need to<br />study smarter.
            </h2>
            <div className="flex flex-wrap gap-2">
              <FeaturePill icon={Brain}       color="#a855f7" label="AI Study Assistant" />
              <FeaturePill icon={TrendingUp}  color="#fbbf24" label="GPA Tracker" />
              <FeaturePill icon={Bell}        color="#f87171" label="Class Reminders" />
              <FeaturePill icon={BookOpen}    color="#22d3ee" label="Course Materials" />
              <FeaturePill icon={CheckCircle} color="#34d399" label="Attendance Tracking" />
              <FeaturePill icon={Shield}      color="#60a5fa" label="Secure & Private" />
            </div>
            <p className="text-xs text-dark-400 font-body leading-relaxed mt-3">
              Your academic data stays private and is never sold, sign-in is protected by the same authentication used by major apps, and the built-in AI assistant is there to help you understand material faster — not to replace your own learning.
            </p>
          </motion.div>
        )}

        {mode === 'signup' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-1">Free to Start · No Card Needed</p>
            <h2 className="text-xl font-black text-white font-display mb-3" style={{ letterSpacing: '-0.5px' }}>
              Your academic life,<br />finally organised.
            </h2>
            <div className="space-y-2">
              {[
                'AI-powered study assistant included',
                'Track GPA on 3.0, 4.0, or 5.0 scale',
                'Smart timetable with class reminders',
                'Upload and organise course materials',
              ].map(item => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle size={11} className="text-green-400 flex-shrink-0" />
                  <span className="text-xs text-dark-300 font-body">{item}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-dark-400 font-body leading-relaxed mt-3">
              Setup takes under a minute, and everything you enter — your timetable, materials, and grades — stays private to your account and syncs automatically across every device you use.
            </p>
          </motion.div>
        )}

        {mode === 'reset' && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <h2 className="text-xl font-black text-white font-display mb-1" style={{ letterSpacing: '-0.5px' }}>
              Forgot your password?
            </h2>
            <p className="text-xs text-dark-400 font-body leading-relaxed">
              Enter your email address and we'll send you a link to reset your password. The link expires after 1 hour.
            </p>
          </motion.div>
        )}
      </div>

      {/* ── FORM PANEL ───────────────────────────────────────────────────── */}
      <div className="flex-1 px-5 pb-10 pt-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="mb-5">
              {mode !== 'login' && (
                <button onClick={() => switchMode('login')}
                  className="flex items-center gap-1 text-xs text-dark-500 hover:text-dark-300 mb-3 transition-colors">
                  <ArrowLeft size={12} /> Back to sign in
                </button>
              )}
              <h1 className="text-xl font-black text-white font-display" style={{ letterSpacing: '-0.5px' }}>{title}</h1>
              <p className="text-xs text-dark-500 font-body mt-0.5">{subtitle}</p>
            </div>

            <div className="space-y-4" onKeyDown={handleKey}>
              {mode === 'signup' && (
                <AuthInput label="Full Name" value={fullName} onChange={setFullName}
                  icon={User} placeholder="e.g. Adebayo Johnson" error={errors.fullName} />
              )}
              <AuthInput label="Email Address" type="email" value={email} onChange={setEmail}
                icon={Mail} placeholder="you@university.edu" error={errors.email} />
              {mode !== 'reset' && (
                <AuthInput
                  label="Password" type={showPass ? 'text' : 'password'}
                  value={password} onChange={setPassword}
                  icon={Lock} placeholder="••••••••" error={errors.password}
                  hint={mode === 'signup' ? 'At least 8 characters' : undefined}
                  rightSlot={
                    <button onClick={() => setShowPass(s => !s)} className="text-dark-500 hover:text-dark-300 p-1 flex-shrink-0">
                      {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              )}
              {mode === 'signup' && (
                <AuthInput
                  label="Confirm Password" type={showConfirm ? 'text' : 'password'}
                  value={confirm} onChange={setConfirm}
                  icon={Lock} placeholder="••••••••" error={errors.confirm}
                  rightSlot={
                    <button onClick={() => setShowConfirm(s => !s)} className="text-dark-500 hover:text-dark-300 p-1 flex-shrink-0">
                      {showConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  }
                />
              )}
            </div>

            {/* Forgot password link */}
            {mode === 'login' && (
              <button onClick={() => switchMode('reset')}
                className="text-[10px] text-dark-500 hover:text-dark-300 mt-2 block transition-colors font-body">
                Forgot your password?
              </button>
            )}

            {/* Errors / success */}
            <AnimatePresence>
              {globalErr && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-xs text-red-400 font-body">{globalErr}</p>
                </motion.div>
              )}
              {success && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="mt-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                  <p className="text-xs text-green-400 font-body">{success}</p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full mt-5 py-3.5 rounded-2xl font-bold text-sm text-dark-950 flex items-center justify-center gap-2
                         disabled:opacity-50 transition-all touch-manipulation active:scale-[0.97]"
              style={{ background: loading ? 'rgba(34,197,94,0.5)' : 'linear-gradient(135deg, #22c55e, #16a34a)' }}
            >
              {loading ? (
                <motion.div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full"
                  animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
              ) : (
                <>{btnLabel} <ChevronRight size={15} /></>
              )}
            </button>

            {/* Switch mode */}
            <p className="text-xs text-dark-500 text-center mt-4 font-body">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-green-400 font-bold hover:text-green-300 transition-colors">
                    Sign up free
                  </button>
                </>
              ) : mode === 'signup' ? (
                <>Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="text-green-400 font-bold hover:text-green-300 transition-colors">
                    Sign in
                  </button>
                </>
              ) : null}
            </p>

            {/* Trust signals */}
            {mode !== 'reset' && (
              <div className="flex items-center justify-center gap-4 mt-5">
                {[
                  { icon: Shield, label: 'Secure' },
                  { icon: CheckCircle, label: 'Free tier' },
                  { icon: Sparkles, label: 'AI included' },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-1">
                    <Icon size={10} className="text-dark-600" />
                    <span className="text-[9px] text-dark-600 font-body">{label}</span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}