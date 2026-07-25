// src/pages/AuthScreen.tsx
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../hooks/useStore';
import { ROUTES } from '../routes';
import { Eye, EyeOff, ChevronLeft, Mail, Lock, User } from 'lucide-react';

// ── Pill input, matches the reference's rounded full-width field style ────────
function AuthInput({
  label, type = 'text', value, onChange, placeholder,
  icon: Icon, rightSlot, error,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
  icon: any; rightSlot?: React.ReactNode; error?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-dark-400 font-body">{label}</label>
      <div className={`flex items-center bg-dark-800 border rounded-full px-5 gap-2.5 transition-colors
        ${error ? 'border-red-500/50' : 'border-white/8 focus-within:border-green-500/40'}`}>
        <Icon size={15} className="text-dark-500 flex-shrink-0" />
        <input
          type={type} value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent text-white text-sm font-body py-3.5 outline-none placeholder-dark-600 min-w-0"
        />
        {rightSlot}
      </div>
      {error && <p className="text-[10px] text-red-400 font-body pl-1">{error}</p>}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function AuthScreen() {
  const navigate = useNavigate();
  const { signIn, signUp, resetPassword, signInWithGoogle } = useStore();

  const [mode, setMode]               = useState<'login' | 'signup' | 'reset'>('login');
  const [showPass, setShowPass]       = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [fullName, setFullName]       = useState('');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [confirm, setConfirm]         = useState('');

  const [loading, setLoading]             = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
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

  const handleGoogleSignIn = async () => {
    clearErrors();
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setGlobalErr(err?.message || 'Could not sign in with Google. Please try again.');
    } finally {
      setGoogleLoading(false);
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

  const title    = mode === 'login' ? 'Login Now To Your Account.' : mode === 'signup' ? 'Sign Up To Your Account.' : 'Reset your password.';
  const subtitle = mode === 'login' ? 'Access your account to manage settings, track your study plan and more.'
                 : mode === 'signup' ? 'Set up your account to start tracking classes, grades, and study time.'
                 : 'Enter your email and we\'ll send you a link to reset your password.';
  const btnLabel = mode === 'login' ? 'Login' : mode === 'signup' ? 'Sign Up' : 'Send Reset Link';

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      {/* ── Sticky header ─────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-20 flex items-center gap-4 px-6 pt-14 pb-4"
        style={{ background: 'rgba(10,10,15,0.85)', backdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        <button
          onClick={() => (mode === 'login' ? navigate(ROUTES.welcome) : switchMode('login'))}
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: 'rgba(255,255,255,0.06)' }}
          aria-label="Back"
        >
          <ChevronLeft size={18} className="text-white" />
        </button>
        <span className="text-base font-black text-white font-display">StudiByte</span>
      </div>

      <div className="flex-1 flex flex-col px-6 pt-6 pb-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={mode}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="flex-1 flex flex-col"
        >
          <h1 className="text-2xl font-black text-white font-display mb-2" style={{ letterSpacing: '-0.5px' }}>
            {title}
          </h1>
          <p className="text-sm text-dark-400 font-body mb-7 leading-relaxed">
            {subtitle}
          </p>

          <div className="space-y-4" onKeyDown={handleKey}>
            {mode === 'signup' && (
              <AuthInput label="Full Name" value={fullName} onChange={setFullName}
                icon={User} placeholder="e.g. Adebayo Johnson" error={errors.fullName} />
            )}
            <AuthInput label="Email" type="email" value={email} onChange={setEmail}
              icon={Mail} placeholder="you@university.edu" error={errors.email} />
            {mode !== 'reset' && (
              <AuthInput
                label="Password" type={showPass ? 'text' : 'password'}
                value={password} onChange={setPassword}
                icon={Lock} placeholder="••••••••••" error={errors.password}
                rightSlot={
                  <button onClick={() => setShowPass(s => !s)} className="text-dark-500 hover:text-dark-300 p-1 flex-shrink-0">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            )}
            {mode === 'signup' && (
              <AuthInput
                label="Confirm Password" type={showConfirm ? 'text' : 'password'}
                value={confirm} onChange={setConfirm}
                icon={Lock} placeholder="••••••••••" error={errors.confirm}
                rightSlot={
                  <button onClick={() => setShowConfirm(s => !s)} className="text-dark-500 hover:text-dark-300 p-1 flex-shrink-0">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
            )}
          </div>

          {mode === 'login' && (
            <div className="flex justify-end mt-2.5">
              <button onClick={() => switchMode('reset')}
                className="text-xs font-semibold text-green-400 hover:text-green-300 transition-colors font-body">
                Forgot password?
              </button>
            </div>
          )}

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

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full mt-6 py-4 rounded-full font-bold text-sm text-dark-950 flex items-center justify-center gap-2
                       disabled:opacity-50 transition-all touch-manipulation active:scale-[0.97]"
            style={{ background: loading ? 'rgba(34,197,94,0.5)' : 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            {loading ? (
              <motion.div className="w-4 h-4 border-2 border-dark-950/30 border-t-dark-950 rounded-full"
                animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
            ) : btnLabel}
          </button>

          {mode !== 'reset' && (
            <>
              <div className="flex items-center gap-3 my-5">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[10px] text-dark-600 font-body uppercase tracking-wider">or</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={googleLoading || loading}
                className="w-full py-3.5 rounded-full font-semibold text-sm text-white flex items-center justify-center gap-2.5
                           bg-dark-800 border border-white/8 disabled:opacity-50 transition-colors
                           hover:bg-dark-700 touch-manipulation active:scale-[0.98]"
              >
                {googleLoading ? (
                  <motion.div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                    animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 8 3l6-6C34 5.5 29.3 3.5 24 3.5 12.7 3.5 3.5 12.7 3.5 24S12.7 44.5 24 44.5 44.5 35.3 44.5 24c0-1.2-.1-2.4-.3-3.5z"/>
                      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.9 19 13 24 13c3.1 0 5.8 1.1 8 3l6-6C34 5.5 29.3 3.5 24 3.5c-7.7 0-14.3 4.4-17.7 10.8z"/>
                      <path fill="#4CAF50" d="M24 44.5c5.2 0 9.9-1.7 13.4-4.7l-6.2-5.2c-2 1.4-4.6 2.2-7.2 2.2-5.3 0-9.7-3.4-11.3-8.1l-6.5 5C9.6 40 16.2 44.5 24 44.5z"/>
                      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.8 36 44.5 30.6 44.5 24c0-1.2-.1-2.4-.3-3.5z"/>
                    </svg>
                    Sign in with Google
                  </>
                )}
              </button>
            </>
          )}

          <div className="flex-1" />

          {mode !== 'reset' && (
            <p className="text-xs text-dark-500 text-center mt-6 font-body">
              {mode === 'login' ? (
                <>Don't have an account?{' '}
                  <button onClick={() => switchMode('signup')} className="text-green-400 font-bold hover:text-green-300 transition-colors">
                    Sign up
                  </button>
                </>
              ) : (
                <>Already have an account?{' '}
                  <button onClick={() => switchMode('login')} className="text-green-400 font-bold hover:text-green-300 transition-colors">
                    Login
                  </button>
                </>
              )}
            </p>
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}