// src/pages/admin/NotificationsAdmin.tsx
//
// Admin-only panel for composing and sending push notifications.
// Route-guarded by RequireAdmin (src/components/admin/RequireAdmin.tsx) —
// the actual security boundary is server-side (Cloud Functions re-verify the
// admins/{uid} allowlist), this page and the guard are UI-only.

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, Clock, Image as ImageIcon, Link as LinkIcon, Users, User, Layers, CheckCircle, AlertTriangle, LogOut } from 'lucide-react';
import {
  sendNotificationNow,
  scheduleNotificationCampaign,
  NotificationTarget,
} from '../../services/notificationAdmin';
import { useAdminAuth } from '../../hooks/useAdminAuth';
import { ROUTES } from '../../routes';

type TargetMode = 'all' | 'user' | 'segment';

export default function NotificationsAdmin() {
  const { user, logout } = useAdminAuth();
  const navigate = useNavigate();

  const [title, setTitle]       = useState('');
  const [body, setBody]         = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [deepLink, setDeepLink] = useState('');
  const [type, setType]         = useState('general');

  const [targetMode, setTargetMode] = useState<TargetMode>('all');
  const [targetUid, setTargetUid]   = useState('');
  const [segmentField, setSegmentField] = useState('');
  const [segmentValue, setSegmentValue] = useState('');

  const [scheduleAt, setScheduleAt] = useState(''); // datetime-local value

  const [sending, setSending] = useState(false);
  const [result, setResult]   = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const buildTarget = (): NotificationTarget => {
    if (targetMode === 'all') return { mode: 'all' };
    if (targetMode === 'user') return { mode: 'user', uid: targetUid.trim() };
    return { mode: 'segment', field: segmentField.trim(), value: segmentValue.trim() };
  };

  const validate = (): string | null => {
    if (!title.trim()) return 'Title is required.';
    if (!body.trim()) return 'Message is required.';
    
    // Add .trim() here so an empty input containing only spaces is correctly ignored
    if (imageUrl.trim() && !/^https:\/\//.test(imageUrl.trim())) {
      return 'Image URL must start with https://.';
    }
    
    if (targetMode === 'user' && !targetUid.trim()) return 'User ID is required.';
    if (targetMode === 'segment' && (!segmentField.trim() || !segmentValue.trim())) return 'Segment field and value are required.';
    return null;
  };

  const handleSend = async () => {
    if (sending) return; // prevent duplicate submissions

    const validationError = validate();
    if (validationError) {
      setResult({ type: 'error', message: validationError });
      return;
    }

    setSending(true);
    setResult(null);
    try {
      const payload = {
        title: title.trim(),
        body: body.trim(),
        imageUrl: imageUrl.trim() || undefined,
        deepLink: deepLink.trim() || '/',
        type,
      };
      const target = buildTarget();

      if (scheduleAt) {
        await scheduleNotificationCampaign(target, payload, new Date(scheduleAt));
        setResult({ type: 'success', message: 'Notification scheduled.' });
      } else {
        const res = await sendNotificationNow(target, payload);
        setResult({
          type: 'success',
          message: `Sent to ${res.successCount} device(s). ${res.failureCount} failed. ${res.invalidTokensRemoved} stale token(s) removed.`,
        });
      }

      setTitle(''); setBody(''); setImageUrl(''); setDeepLink(''); setScheduleAt('');
    } catch (err: any) {
      setResult({ type: 'error', message: err?.message ?? 'Failed to send notification.' });
    } finally {
      setSending(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.adminLogin, { replace: true });
  };

  const inputClass =
    'w-full bg-dark-900/60 border border-white/8 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-dark-600 focus:outline-none focus:border-green-500/50 transition-colors';

  const TARGET_OPTIONS: { mode: TargetMode; label: string; icon: typeof Users }[] = [
    { mode: 'all',     label: 'All users',    icon: Users  },
    { mode: 'user',    label: 'Single user',  icon: User   },
    { mode: 'segment', label: 'Segment',      icon: Layers },
  ];

  return (
    <div className="max-w-lg mx-auto px-5 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Send size={16} className="text-green-400" />
          <h1 className="text-base font-black text-white">Send Notification</h1>
        </div>
        <div className="flex items-center gap-3">
          {user?.email && <span className="text-[11px] text-dark-500 hidden sm:inline">{user.email}</span>}
          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 text-[11px] font-bold text-dark-400 hover:text-red-400 transition-colors"
          >
            <LogOut size={12} /> Logout
          </button>
        </div>
      </div>

      {/* Message */}
      <div className="space-y-3 p-4 rounded-2xl bg-dark-900/40 border border-white/5">
        <div>
          <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 block">Title</label>
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="New assignment reminder" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 block">Message</label>
          <textarea className={inputClass} value={body} onChange={e => setBody(e.target.value)} maxLength={500} rows={3} placeholder="Your CS201 assignment is due tomorrow." />
        </div>
        <div>
          <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <ImageIcon size={11} /> Image URL (optional)
          </label>
          <input className={inputClass} value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://…" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
            <LinkIcon size={11} /> Deep link (optional)
          </label>
          <input className={inputClass} value={deepLink} onChange={e => setDeepLink(e.target.value)} placeholder="/app/assignments" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 block">Type</label>
          <input className={inputClass} value={type} onChange={e => setType(e.target.value)} placeholder="general" />
        </div>
      </div>

      {/* Target */}
      <div className="p-4 rounded-2xl bg-dark-900/40 border border-white/5 space-y-3">
        <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider block">Target</label>
        <div className="flex gap-2">
          {TARGET_OPTIONS.map(({ mode, label, icon: Icon }) => (
            <button
              key={mode}
              onClick={() => setTargetMode(mode)}
              className="flex-1 flex flex-col items-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-colors"
              style={{
                background: targetMode === mode ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.03)',
                border: targetMode === mode ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(255,255,255,0.07)',
                color: targetMode === mode ? '#4ade80' : '#9ca3af',
              }}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {targetMode === 'user' && (
          <input className={inputClass} value={targetUid} onChange={e => setTargetUid(e.target.value)} placeholder="User ID (uid)" />
        )}

        {targetMode === 'segment' && (
          <div className="grid grid-cols-2 gap-2">
            <input className={inputClass} value={segmentField} onChange={e => setSegmentField(e.target.value)} placeholder="Field (e.g. plan)" />
            <input className={inputClass} value={segmentValue} onChange={e => setSegmentValue(e.target.value)} placeholder="Value (e.g. pro)" />
          </div>
        )}
      </div>

      {/* Schedule */}
      <div className="p-4 rounded-2xl bg-dark-900/40 border border-white/5">
        <label className="text-[10px] font-bold text-dark-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
          <Clock size={11} /> Schedule for later (optional)
        </label>
        <input
          type="datetime-local"
          className={inputClass}
          value={scheduleAt}
          onChange={e => setScheduleAt(e.target.value)}
          min={new Date().toISOString().slice(0, 16)}
        />
      </div>

      {result && (
        <motion.div
          className="flex items-start gap-2 p-3 rounded-xl"
          style={{
            background: result.type === 'success' ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)',
            border: result.type === 'success' ? '1px solid rgba(34,197,94,0.25)' : '1px solid rgba(239,68,68,0.25)',
          }}
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
        >
          {result.type === 'success'
            ? <CheckCircle size={14} className="text-green-400 mt-0.5 shrink-0" />
            : <AlertTriangle size={14} className="text-red-400 mt-0.5 shrink-0" />}
          <p className={`text-xs ${result.type === 'success' ? 'text-green-300' : 'text-red-300'}`}>{result.message}</p>
        </motion.div>
      )}

      <button
        onClick={handleSend}
        disabled={sending}
        className="w-full py-3 rounded-2xl font-bold text-sm text-dark-950 flex items-center justify-center gap-2 disabled:opacity-50"
        style={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
      >
        <Send size={14} />
        {sending ? 'Sending…' : scheduleAt ? 'Schedule Notification' : 'Send Now'}
      </button>
    </div>
  );
}