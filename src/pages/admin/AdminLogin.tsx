// src/pages/admin/AdminLogin.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, Mail, Lock, AlertTriangle, Loader2 } from 'lucide-react';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ROUTES } from '../../routes';

export default function AdminLogin() {
  const { login, isAdmin, loading } = useAdminAuth();
  const navigate = useNavigate();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]       = useState<string | null>(null);

  // Already an authenticated admin (e.g. refreshed this page) → skip the form.
  useEffect(() => {
    if (!loading && isAdmin) navigate(ROUTES.notificationsAdmin, { replace: true });
  }, [loading, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // prevent duplicate submissions

    if (!email.trim() || !password) {
      setError('Email and password are required.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(ROUTES.notificationsAdmin, { replace: true });
    } catch (err: any) {
      setError(err?.message ?? 'Sign-in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark-950 flex items-center justify-center">
        <Loader2 size={22} className="text-green-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-950 flex items-center justify-center px-5">
      <motion.div
        className="w-full max-w-sm p-6 rounded-2xl bg-dark-900/60 border border-white/8"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
            <ShieldCheck size={16} className="text-green-400" />
          </div>
          <h1 className="text-base font-black text-white">Admin Sign In</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Mail size={11} /> Email
            </label>
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-dark-900/60 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-dark-600 focus:outline-none focus:border-green-500/50 transition-colors"
              placeholder="admin@studibyte.space"
              disabled={submitting}
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Lock size={11} /> Password
            </label>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-dark-900/60 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-dark-600 focus:outline-none focus:border-green-500/50 transition-colors"
              placeholder="••••••••"
              disabled={submitting}
            />
          </div>

          {error && (
            <motion.div
              className="flex items-start gap-2 p-3 rounded-xl"
              style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
              initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            >
              <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-xs text-red-300">{error}</p>
            </motion.div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl font-bold text-sm text-dark-950 flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
