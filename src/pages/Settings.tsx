import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, Download, Trash2, Moon, Sun, ChevronRight, Shield, Volume2,
  Clock, GraduationCap, Camera, LogOut, Lock, User, Sparkles,
  FileText, Info, HelpCircle, AlertTriangle, Mail, Phone,
  ChevronDown, ChevronUp, X, MessageSquare, Bug, Send,
  BookOpen, Star, ExternalLink, Database,
} from 'lucide-react';
import { useState, useRef } from 'react';
import { useStore } from '../hooks/useStore';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { requestNotificationPermission } from '../services/notifications';
import { exportAllData, clearAllData } from '../services/db';
import { StudentProfile, ProgramLevel, Semester, PROGRAM_LEVEL_META, DEFAULT_PROGRAM_LEVEL, CGPA_SCALE_OPTIONS, DEFAULT_CGPA_SCALE, CgpaScale } from '../types';

const DEPARTMENTS = [
  'Computer Science','Business Administration','Accountancy',
  'Electrical/Electronics Engineering','Mechanical Engineering','Civil Engineering',
  'Mass Communication','Public Administration','Marketing','Banking & Finance',
  'Science Laboratory Technology','Statistics','Architecture','Quantity Surveying','Other',
];

// Derived from PROGRAM_LEVEL_META — adding a new level in index.ts
// automatically appears here. No manual sync needed.
const LEVEL_OPTIONS = PROGRAM_LEVEL_META.map(m => ({ value: m.value, label: m.label }));

// ── Download helper ────────────────────────────────────────────────────────
function downloadAsText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ── Toggle ─────────────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} className="relative flex-shrink-0 touch-manipulation"
      style={{ width: 48, height: 26, borderRadius: 13, background: value ? 'linear-gradient(135deg,#22c55e,#059669)' : 'rgba(255,255,255,0.1)', transition: 'background 0.2s', boxShadow: value ? '0 0 12px rgba(34,197,94,0.3)' : 'none' }}>
      <motion.div className="absolute rounded-full bg-white shadow-lg"
        style={{ width: 18, height: 18, top: 4 }}
        animate={{ left: value ? 26 : 4 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }} />
    </button>
  );
}

// ── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, icon, children, accentColor = '#6b7280' }: {
  title: string; icon?: React.ReactNode; children: React.ReactNode; accentColor?: string;
}) {
  return (
    <motion.div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        {icon && <span style={{ color: accentColor }}>{icon}</span>}
        <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{title}</p>
      </div>
      {children}
      <div className="h-1" />
    </motion.div>
  );
}

// ── Row item ───────────────────────────────────────────────────────────────
function Row({ icon, label, sub, children, onClick, danger = false, iconBg }: {
  icon: React.ReactNode; label: string; sub?: string;
  children?: React.ReactNode; onClick?: () => void; danger?: boolean; iconBg?: string;
}) {
  return (
    <motion.div className={`flex items-center gap-3 py-3.5 px-4 ${onClick ? 'cursor-pointer touch-manipulation' : ''}`}
      onClick={onClick} whileTap={onClick ? { scale: 0.98 } : undefined}
      style={onClick ? { WebkitTapHighlightColor: 'transparent' } : undefined}>
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
        style={{ background: danger ? 'rgba(248,113,113,0.1)' : (iconBg || 'rgba(255,255,255,0.06)') }}>
        <span style={{ color: danger ? '#f87171' : '#9ca3af' }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: danger ? '#f87171' : '#fff' }}>{label}</p>
        {sub && <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#4b5563' }}>{sub}</p>}
      </div>
      {children ?? (onClick && <ChevronRight size={15} style={{ color: '#374151' }} />)}
    </motion.div>
  );
}

// ── Divider ────────────────────────────────────────────────────────────────
const Divider = () => <div className="h-px mx-4" style={{ background: 'rgba(255,255,255,0.05)' }} />;

// ── PIN pad ────────────────────────────────────────────────────────────────
function PinDots({ length, filled }: { length: number; filled: number }) {
  return (
    <div className="flex items-center justify-center gap-5 my-8">
      {Array.from({ length }).map((_, i) => (
        <motion.div key={i} className="rounded-full border-2"
          style={{ width: 18, height: 18, background: i < filled ? '#22c55e' : 'transparent', borderColor: i < filled ? '#22c55e' : '#374151', boxShadow: i < filled ? '0 0 8px rgba(34,197,94,0.5)' : 'none' }}
          animate={{ scale: i === filled - 1 ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.15 }} />
      ))}
    </div>
  );
}
function PinPad({ onDigit, onDelete }: { onDigit: (d: string) => void; onDelete: () => void }) {
  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];
  return (
    <div className="grid grid-cols-3 gap-3 px-4">
      {keys.map((k, i) => k === '' ? <div key={i} /> : (
        <motion.button key={k} onClick={() => k === '⌫' ? onDelete() : onDigit(k)}
          className="h-16 rounded-2xl text-xl font-black flex items-center justify-center touch-manipulation"
          style={{ background: k === '⌫' ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: k === '⌫' ? '#6b7280' : '#fff' }}
          whileTap={{ scale: 0.88 }}>{k}</motion.button>
      ))}
    </div>
  );
}

// ── Legal / info modal ─────────────────────────────────────────────────────
function LegalModal({
  isOpen, onClose, title, accentColor, downloadName, downloadContent, children,
}: {
  isOpen: boolean; onClose: () => void; title: string; accentColor: string;
  downloadName: string; downloadContent: string; children: React.ReactNode;
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="flex flex-col flex-1 overflow-hidden rounded-t-3xl mt-12"
            style={{ background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.08)' }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest mb-0.5" style={{ color: accentColor }}>StudiByte</p>
                <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{title}</h2>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => downloadAsText(downloadName, downloadContent)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold touch-manipulation"
                  style={{ background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor }}
                  whileTap={{ scale: 0.93 }}>
                  <Download size={13} /> Download
                </motion.button>
                <motion.button onClick={onClose}
                  className="w-9 h-9 rounded-xl flex items-center justify-center touch-manipulation"
                  style={{ background: 'rgba(255,255,255,0.06)', color: '#6b7280' }}
                  whileTap={{ scale: 0.9 }}>
                  <X size={17} />
                </motion.button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              {children}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Legal content components ───────────────────────────────────────────────
function LegalH1({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-black text-white" style={{ fontFamily: 'Georgia, serif' }}>{children}</h2>;
}
function LegalH2({ children, color = '#9ca3af' }: { children: React.ReactNode; color?: string }) {
  return <h3 className="text-xs font-black uppercase tracking-widest mt-4 mb-1" style={{ color }}>{children}</h3>;
}
function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{children}</p>;
}
function LegalList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 mt-1">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#9ca3af' }}>
          <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: '#22c55e' }} />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── FAQ accordion item ─────────────────────────────────────────────────────
function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <motion.div className="rounded-2xl overflow-hidden"
      style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
      <button className="w-full flex items-center justify-between px-4 py-3.5 text-left touch-manipulation"
        onClick={() => setOpen(o => !o)} style={{ WebkitTapHighlightColor: 'transparent' }}>
        <p className="text-sm font-bold text-white pr-4">{q}</p>
        {open ? <ChevronUp size={16} style={{ color: '#22c55e', flexShrink: 0 }} /> : <ChevronDown size={16} style={{ color: '#4b5563', flexShrink: 0 }} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }} style={{ overflow: 'hidden' }}>
            <div className="px-4 pb-4 pt-0">
              <div className="h-px mb-3" style={{ background: 'rgba(255,255,255,0.06)' }} />
              <p className="text-sm leading-relaxed" style={{ color: '#9ca3af' }}>{a}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Contact form ───────────────────────────────────────────────────────────
function ContactForm() {
  const [type, setType]       = useState<'support' | 'feedback' | 'bug'>('support');
  const [name, setName]       = useState('');
  const [email, setEmail]     = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent]       = useState(false);

  const handleSend = () => {
    if (!name.trim() || !email.trim() || !message.trim()) return;
    const subject = type === 'support' ? 'Support Request' : type === 'feedback' ? 'Feedback' : 'Bug Report';
    const body    = `Name: ${name}\nEmail: ${email}\n\n${message}`;
    window.location.href = `mailto:support@adebyte.tech?subject=${encodeURIComponent(`[StudiByte] ${subject}`)}&body=${encodeURIComponent(body)}`;
    setSent(true);
  };

  if (sent) return (
    <motion.div className="rounded-2xl p-6 text-center"
      style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.25)' }}
      initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
      <div className="text-4xl mb-3">✅</div>
      <p className="text-base font-black text-white mb-1">Message Sent!</p>
      <p className="text-sm text-dark-400">We'll respond within 24–48 hours. Thank you for reaching out!</p>
      <button onClick={() => { setSent(false); setName(''); setEmail(''); setMessage(''); }}
        className="mt-4 text-xs font-bold text-green-400 touch-manipulation">Send another</button>
    </motion.div>
  );

  return (
    <div className="space-y-4">
      {/* Type selector */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { id: 'support',  icon: <Mail size={14} />,        label: 'Support'  },
          { id: 'feedback', icon: <MessageSquare size={14} />, label: 'Feedback' },
          { id: 'bug',      icon: <Bug size={14} />,          label: 'Bug'      },
        ].map(t => (
          <button key={t.id} onClick={() => setType(t.id as any)}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl text-xs font-bold border transition-all touch-manipulation"
            style={type === t.id
              ? { background: 'rgba(34,197,94,0.12)', borderColor: 'rgba(34,197,94,0.3)', color: '#4ade80' }
              : { background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)', color: '#4b5563' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name"
          className="w-full px-4 py-3.5 text-sm text-white focus:outline-none border-b"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)', color: '#fff' }} />
        <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Your email address" type="email"
          className="w-full px-4 py-3.5 text-sm text-white focus:outline-none border-b"
          style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.07)', color: '#fff' }} />
        <textarea value={message} onChange={e => setMessage(e.target.value)}
          placeholder={type === 'bug' ? 'Describe the bug: what happened, when, and steps to reproduce...' : type === 'feedback' ? 'Share your thoughts, suggestions, or feature requests...' : 'How can we help you today?'}
          rows={5} className="w-full px-4 py-3.5 text-sm text-white focus:outline-none resize-none"
          style={{ background: 'rgba(255,255,255,0.04)', color: '#fff' }} />
      </div>

      <motion.button onClick={handleSend} disabled={!name.trim() || !email.trim() || !message.trim()}
        className="w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 touch-manipulation"
        style={{ background: 'linear-gradient(135deg,#22c55e,#059669)', color: '#000', opacity: (!name.trim() || !email.trim() || !message.trim()) ? 0.4 : 1 }}
        whileTap={{ scale: 0.97 }}>
        <Send size={15} /> Send {type === 'support' ? 'Request' : type === 'feedback' ? 'Feedback' : 'Bug Report'}
      </motion.button>

      <p className="text-center text-xs" style={{ color: '#374151' }}>
        We typically respond within 24–48 hours · <span style={{ color: '#22c55e' }}>support@adebyte.tech</span>
      </p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function Settings() {
  const { settings, updateSettings, profile, saveProfile, signOut } = useStore();

  // Modals
  const [modal, setModal] = useState<'privacy'|'terms'|'about'|'contact'|'faq'|'disclaimer'|null>(null);

  // Profile
  const [showProfile, setShowProfile]             = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showPinSetup, setShowPinSetup]           = useState(false);
  const [pinStep, setPinStep]   = useState<'set'|'confirm'>('set');
  const [pinFirst, setPinFirst] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState('');
  const [profileForm, setProfileForm] = useState<Partial<StudentProfile>>(profile || {
    fullName:'', department:'', programLevel: DEFAULT_PROGRAM_LEVEL,
    cgpaScale: DEFAULT_CGPA_SCALE, matricNumber:'',
    semesterStartDate:'', semesterEndDate:'', targetAttendance:75,
    currentSemester:'First',
    currentAcademicYear:`${new Date().getFullYear()}/${new Date().getFullYear()+1}`,
    avatar:'',
  });
  const [notifGranted, setNotifGranted] = useState(Notification.permission === 'granted');
  const [saving, setSaving] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);

  const setP = (key: keyof StudentProfile, val: string|number) =>
    setProfileForm(p => ({ ...p, [key]: val }));

  const openProfile = () => {
    setProfileForm(profile ? { ...profile } : {
      fullName:'', department:'', programLevel: DEFAULT_PROGRAM_LEVEL,
      cgpaScale: DEFAULT_CGPA_SCALE, matricNumber:'',
      semesterStartDate:'', semesterEndDate:'', targetAttendance:75,
      currentSemester:'First',
      currentAcademicYear:`${new Date().getFullYear()}/${new Date().getFullYear()+1}`,
      avatar:'',
    });
    setShowProfile(true);
  };

  const handleAvatarChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = e => setP('avatar', e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async () => {
    if (!profileForm.fullName?.trim()) return;
    setSaving(true);
    try {
      await saveProfile({
        fullName: profileForm.fullName!.trim(),
        department: profileForm.department || '',
        programLevel: (profileForm.programLevel || DEFAULT_PROGRAM_LEVEL) as ProgramLevel,
        // Number() coercion is the critical fix: Select onChange returns a string
        // from the DOM even after parseFloat — this guarantees a numeric value
        // is always written to Firestore, never the string "3", "4", or "5".
        cgpaScale: Number(profileForm.cgpaScale ?? DEFAULT_CGPA_SCALE) as CgpaScale,
        matricNumber: profileForm.matricNumber || '',
        semesterStartDate: profileForm.semesterStartDate || new Date().toISOString().split('T')[0],
        semesterEndDate: profileForm.semesterEndDate || '',
        targetAttendance: profileForm.targetAttendance || 75,
        currentSemester: (profileForm.currentSemester || 'First') as Semester,
        currentAcademicYear: profileForm.currentAcademicYear || `${new Date().getFullYear()}/${new Date().getFullYear()+1}`,
        avatar: profileForm.avatar || '',
      });
      setShowProfile(false);
      // Clear local base64 from form — store now holds the Storage URL
      setProfileForm(prev => ({ ...prev, avatar: '' }));
    } catch (e: any) {
      console.error('Save profile error:', e);
      alert(`Failed to save profile: ${e?.message || 'Please try again.'}`);
    } finally {
      setSaving(false);
    }
  };

  const handleEnableNotifs = async () => {
    // Must be called directly from user gesture — no intermediate async wrapper
    let permission: NotificationPermission = 'denied';
    if ('Notification' in window) {
      permission = await Notification.requestPermission();
    }
    const granted = permission === 'granted';
    setNotifGranted(granted);
    await updateSettings({
      notifications: {
        ...settings.notifications,
        enabled: granted,
      },
    });
  };

  const handleExport = async () => {
    const data = await exportAllData();
    downloadAsText(`studibyte-backup-${new Date().toISOString().split('T')[0]}.json`, data);
  };

  const handleReset = async () => {
    if (window.confirm('This will delete ALL your data. This cannot be undone.')) {
      await clearAllData();
      window.location.reload();
    }
  };

  const handleLogout = async () => { setShowLogoutConfirm(false); await signOut(); };

  const openPinSetup = () => { setPinStep('set'); setPinFirst(''); setPinInput(''); setPinError(''); setShowPinSetup(true); };
  const handlePinDigit = (d: string) => {
    if (pinInput.length >= 4) return;
    const next = pinInput + d; setPinInput(next);
    if (next.length === 4) {
      setTimeout(() => {
        if (pinStep === 'set') { setPinFirst(next); setPinInput(''); setPinStep('confirm'); setPinError(''); }
        else if (next === pinFirst) { updateSettings({ pin: next } as any); setShowPinSetup(false); setPinInput(''); }
        else { setPinError('PINs do not match. Try again.'); setPinInput(''); setPinStep('set'); setPinFirst(''); }
      }, 120);
    }
  };
  const handlePinDelete = () => setPinInput(p => p.slice(0, -1));
  const handleRemovePin = async () => {
    if (window.confirm('Remove PIN protection?')) await updateSettings({ pin: '' } as any);
  };

  const initials = profile?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'S';
  const hasPin   = !!(settings as any).pin;

  // ── Download content strings ─────────────────────────────────────────────
  const PRIVACY_TEXT = `STUDIBYTE PRIVACY POLICY
Last updated: ${new Date().toLocaleDateString()}

1. DATA COLLECTION
StudiByte collects information you provide directly including your name, email address, department, program level, and academic data such as timetables, assignments, GPA records, and attendance. We also collect usage data to improve app performance.

2. FIREBASE AUTHENTICATION
We use Firebase Authentication by Google to manage user accounts securely. Your login credentials are handled by Firebase and are never stored directly on our servers. Firebase uses industry-standard encryption.

3. ANALYTICS TRACKING
We use Firebase Analytics to understand how students use StudiByte. This helps us improve features and user experience. Analytics data is anonymized and aggregated.

4. ADMOB ADVERTISING
StudiByte may use Google AdMob to display relevant advertisements. AdMob may use device identifiers and usage data to serve personalized ads. You can opt out of personalized ads in your device settings.

5. DATA PROTECTION
Your academic data is stored securely using Firebase Firestore with strict security rules. Only you can access your personal data. We do not sell your information to third parties.

6. ACCOUNT & LOGIN
Your account data is protected by Firebase Authentication. You can delete your account at any time from the Settings screen. Upon deletion, all your data will be permanently removed.

7. CONTACT
For privacy concerns, contact: support@adebyte.tech
ADEBYTE TECH | Founded by Adegbite Olaoluwa`;

  const TERMS_TEXT = `STUDIBYTE TERMS & CONDITIONS
Last updated: ${new Date().toLocaleDateString()}

1. USER RESPONSIBILITIES
By using StudiByte, you agree to provide accurate information, maintain the confidentiality of your account, and use the app only for lawful educational purposes.

2. ACCEPTABLE USE POLICY
You must not use StudiByte to share inappropriate content, attempt to hack or disrupt the service, create multiple accounts to abuse free features, or misrepresent your academic information.

3. INTELLECTUAL PROPERTY
All content, design, code, and branding within StudiByte is the intellectual property of ADEBYTE TECH. You may not copy, distribute, or create derivative works without written permission.

4. ACCOUNT SUSPENSION
ADEBYTE TECH reserves the right to suspend or terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform.

5. LIMITATION OF LIABILITY
StudiByte is provided "as is". ADEBYTE TECH is not liable for any academic outcomes, data loss, or damages arising from app use.

6. EDUCATIONAL USE
StudiByte is designed for educational support. We do not guarantee specific academic results.

Contact: support@adebyte.tech`;

  const ABOUT_TEXT = `ABOUT STUDIBYTE

StudiByte is a modern student productivity and educational platform built to help students stay organized, productive, and academically focused. The app combines smart technology with learning tools to improve student performance and simplify academic life.

Founded by Adegbite Olaoluwa, popularly known as ADEBYTE TECH, StudiByte was created from a passion for technology and impacting knowledge positively. ADEBYTE TECH is a Web/App Developer who has partnered with thousands of business owners and educationists to create impactful digital solutions and educational experiences.

StudiByte aims to empower students with tools like GPA tracking, study timers, assignment management, attendance tracking, reminders, AI-powered study assistance, and more.

Contact: support@adebyte.tech
Brand: ADEBYTE TECH`;

  const DISCLAIMER_TEXT = `STUDIBYTE DISCLAIMER

1. EDUCATIONAL SUPPORT
StudiByte is a supplementary educational tool. It is designed to support your studies, not replace academic instruction, personal effort, or professional academic advice.

2. NO GUARANTEE OF RESULTS
Using StudiByte does not guarantee improved grades, exam success, or academic achievement. Results depend entirely on individual effort and circumstances.

3. AI-GENERATED SUGGESTIONS
Some features in StudiByte may include AI-powered suggestions or study recommendations. These are generated automatically and should be used as guidance only. Always verify important academic information with your institution.

4. USER RESPONSIBILITY
You are solely responsible for the accuracy of data you enter, your academic decisions, and how you use the information provided by this app.

Contact: support@adebyte.tech | ADEBYTE TECH`;

  const FAQ_TEXT = `STUDIBYTE FAQ

Q: How do I reset my password?
A: Go to the login screen and tap "Forgot Password". Enter your email and we'll send a reset link.

Q: How does GPA tracking work?
A: Enter your course grades and credit units. StudiByte calculates your GPA automatically. The grading scale can be configured to match your institution's system.

Q: How do reminders work?
A: Enable notifications in Settings. StudiByte will alert you 10 minutes, 30 minutes, or 1 hour before each class.

Q: Can I use the app offline?
A: Yes. StudiByte uses Firebase offline caching so you can view your timetable and data without internet. Changes sync when you reconnect.

Q: What are premium features?
A: Premium features include unlimited course materials storage, advanced analytics, and priority support.

Q: How does attendance tracking work?
A: After each class, mark it as Attended or Missed. StudiByte tracks your percentage and alerts you if you fall below the 75% requirement.

Q: Is my data secure?
A: Yes. All data is secured using Firebase with encrypted connections and strict security rules. Only you can access your data.`;

  return (
    <div className="min-h-screen bg-dark-950 pb-36 overflow-x-hidden">

      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{ background: 'linear-gradient(160deg,rgba(168,85,247,0.12) 0%,rgba(139,92,246,0.05) 40%,transparent 70%)' }} />
        <div className="absolute -top-10 -right-10 w-44 h-44 rounded-full" style={{ background: 'radial-gradient(circle,rgba(168,85,247,0.1) 0%,transparent 70%)' }} />
        <div className="relative px-5 pt-14 pb-5">
          <motion.div className="flex items-center gap-2 mb-1" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <Sparkles size={13} className="text-purple-400" />
            <span className="text-[10px] font-black text-purple-400/80 uppercase tracking-widest">StudiByte · Account</span>
          </motion.div>
          <motion.h1 className="text-2xl font-black text-white" style={{ fontFamily: 'Georgia, serif', letterSpacing: '-0.5px' }}
            initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 }}>
            Settings
          </motion.h1>
          <motion.p className="text-xs text-dark-400" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }}>
            Preferences, account & legal
          </motion.p>
        </div>
      </div>

      <div className="px-5 space-y-4">

        {/* ── PROFILE CARD ── */}
        <motion.button onClick={openProfile}
          className="w-full rounded-2xl p-4 text-left touch-manipulation relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.1),rgba(5,150,105,0.05))', border: '1px solid rgba(34,197,94,0.25)' }}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }}>
          <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-20" style={{ background: 'radial-gradient(circle,#22c55e,transparent)' }} />
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 flex-shrink-0" style={{ borderColor: 'rgba(34,197,94,0.4)' }}>
              {profile?.avatar
                ? <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22c55e,#065f46)' }}>
                    <span className="text-xl font-black text-white">{initials}</span>
                  </div>
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-black text-white">{profile?.fullName || 'Set up profile'}</p>
              {profile
                ? <>
                    <p className="text-xs text-dark-400 mt-0.5">{profile.department} · {profile.programLevel}</p>
                    {profile.matricNumber && (
                      <span className="text-xs font-mono text-green-400 mt-1 inline-block px-2 py-0.5 rounded-lg" style={{ background: 'rgba(34,197,94,0.1)' }}>
                        {profile.matricNumber}
                      </span>
                    )}
                  </>
                : <p className="text-xs text-dark-400 mt-0.5">Tap to set up your profile</p>
              }
            </div>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <ChevronRight size={15} className="text-green-400" />
            </div>
          </div>
        </motion.button>

        {/* ── APPEARANCE ── */}
        <Section title="Appearance" icon={<Sun size={12} />} accentColor="#fbbf24">
          <Row icon={settings.theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            label="Dark Mode" sub="Easier on the eyes at night" iconBg="rgba(251,191,36,0.1)">
            <Toggle value={settings.theme === 'dark'} onChange={v => updateSettings({ theme: v ? 'dark' : 'light' })} />
          </Row>
        </Section>

        {/* ── NOTIFICATIONS ── */}
        <Section title="Notifications" icon={<Bell size={12} />} accentColor="#60a5fa">
          <Row icon={<Bell size={16} />} label="Enable Notifications"
            sub={notifGranted ? 'Class reminders are active' : 'Tap to enable class reminders'}
            iconBg="rgba(96,165,250,0.1)">
            {notifGranted
              ? <Toggle value={settings.notifications.enabled} onChange={v => updateSettings({ notifications: { ...settings.notifications, enabled: v } })} />
              : <button onClick={handleEnableNotifs} className="text-xs font-bold px-3 py-1.5 rounded-xl touch-manipulation"
                  style={{ background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', color: '#60a5fa' }}>Enable</button>
            }
          </Row>
          {settings.notifications.enabled && (
            <>
              {[['tenMinsBefore','10 mins before'],['thirtyMinsBefore','30 mins before'],['oneHourBefore','1 hour before']].map(([key, label]) => (
                <div key={key}>
                  <Divider />
                  <Row icon={<Clock size={14} />} label={label} iconBg="rgba(96,165,250,0.08)">
                    <Toggle value={(settings.notifications as any)[key]}
                      onChange={v => updateSettings({ notifications: { ...settings.notifications, [key]: v } })} />
                  </Row>
                </div>
              ))}
              <Divider />
              <Row icon={<Volume2 size={14} />} label="Sound" iconBg="rgba(96,165,250,0.08)">
                <Toggle value={settings.notifications.sound} onChange={v => updateSettings({ notifications: { ...settings.notifications, sound: v } })} />
              </Row>
            </>
          )}
        </Section>

        {/* ── SECURITY ── */}
        <Section title="Security" icon={<Shield size={12} />} accentColor="#a78bfa">
          <Row icon={<Lock size={16} />} label={hasPin ? 'Change PIN' : 'Set Up PIN'}
            sub={hasPin ? '4-digit PIN is active' : 'Add a PIN for extra security'}
            iconBg="rgba(167,139,250,0.1)" onClick={openPinSetup} />
          {hasPin && (<><Divider /><Row icon={<Lock size={16} />} label="Remove PIN" sub="Disable PIN protection" onClick={handleRemovePin} danger /></>)}
        </Section>

        {/* ── LEGAL & INFO ── */}
        <Section title="Legal & Information" icon={<FileText size={12} />} accentColor="#34d399">
          {[
            { key: 'privacy',    icon: <Shield size={16} />,       label: 'Privacy Policy',    sub: 'How we handle your data',            color: 'rgba(52,211,153,0.1)' },
            { key: 'terms',      icon: <FileText size={16} />,     label: 'Terms & Conditions', sub: 'Rules for using StudiByte',         color: 'rgba(96,165,250,0.1)' },
            { key: 'about',      icon: <BookOpen size={16} />,     label: 'About Us',           sub: 'The story behind StudiByte',        color: 'rgba(251,191,36,0.1)' },
            { key: 'contact',    icon: <Mail size={16} />,         label: 'Contact & Support',  sub: 'Get help · Send feedback',          color: 'rgba(167,139,250,0.1)' },
            { key: 'faq',        icon: <HelpCircle size={16} />,   label: 'FAQ',                sub: 'Frequently asked questions',        color: 'rgba(251,146,60,0.1)' },
            { key: 'disclaimer', icon: <AlertTriangle size={16} />, label: 'Disclaimer',        sub: 'Important usage notices',           color: 'rgba(248,113,113,0.1)' },
          ].map((item, i, arr) => (
            <div key={item.key}>
              {i > 0 && <Divider />}
              <Row icon={item.icon} label={item.label} sub={item.sub} iconBg={item.color}
                onClick={() => setModal(item.key as any)} />
            </div>
          ))}
        </Section>

        {/* ── DATA ── */}
        <Section title="Data & Storage" icon={<Database size={12} />} accentColor="#34d399">
          <Row icon={<Download size={16} />} label="Export Backup" sub="Download all your data as JSON"
            iconBg="rgba(52,211,153,0.1)" onClick={handleExport} />
          <Divider />
          <Row icon={<Database size={16} />} label="Cloud Storage" sub="Synced securely to Firebase" iconBg="rgba(52,211,153,0.08)" />
        </Section>

        {/* ── ACCOUNT ── */}
        <Section title="Account" icon={<User size={12} />} accentColor="#f87171">
          <Row icon={<LogOut size={16} />} label="Log Out" sub="You'll be taken to the login screen."
            onClick={() => setShowLogoutConfirm(true)} danger />
          <Divider />
          <Row icon={<Trash2 size={16} />} label="Reset All Data" sub="Permanently deletes all records"
            onClick={handleReset} danger />
        </Section>

        {/* ── ABOUT BRAND ── */}
        <motion.div className="rounded-2xl p-4 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg,rgba(34,197,94,0.08),rgba(5,150,105,0.04))', border: '1px solid rgba(34,197,94,0.15)' }}
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="absolute right-4 top-4 text-4xl opacity-10">🚀</div>
          <div className="flex items-center gap-2 mb-2">
            <Star size={11} className="text-green-400" fill="#22c55e" />
            <p className="text-[10px] font-black text-green-400 uppercase tracking-widest">ADEBYTE TECH</p>
          </div>
          <p className="text-sm font-bold text-white mb-0.5">StudiByte v3.0.0</p>
          <p className="text-xs text-dark-400">Built by AdebyteTech · First Edition</p>
          <p className="text-xs mt-1" style={{ color: '#22c55e' }}>support@adebyte.tech</p>
        </motion.div>

        <p className="text-center text-xs pb-2" style={{ color: '#374151' }}>
          © {new Date().getFullYear()} ADEBYTE TECH · Made with 💚 for students
        </p>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          LEGAL MODALS
      ══════════════════════════════════════════════════════════════════ */}

      {/* PRIVACY POLICY */}
      <LegalModal isOpen={modal === 'privacy'} onClose={() => setModal(null)}
        title="Privacy Policy" accentColor="#34d399"
        downloadName="StudiByte-Privacy-Policy.txt" downloadContent={PRIVACY_TEXT}>
        <LegalH1>Privacy Policy</LegalH1>
        <LegalP>Last updated: {new Date().toLocaleDateString()} · ADEBYTE TECH</LegalP>
        <LegalH2 color="#34d399">1. Data Collection</LegalH2>
        <LegalP>StudiByte collects information you provide directly, including your name, email, department, program level, and academic data such as timetables, assignments, GPA records, and attendance.</LegalP>
        <LegalH2 color="#34d399">2. Firebase Authentication</LegalH2>
        <LegalP>We use Firebase Authentication by Google to manage user accounts securely. Your credentials are handled by Firebase using industry-standard encryption and are never stored on our servers directly.</LegalP>
        <LegalH2 color="#34d399">3. Analytics Tracking</LegalH2>
        <LegalP>We use Firebase Analytics to understand how students interact with StudiByte. This data is anonymized and helps us improve features. No personally identifiable data is shared with analytics providers.</LegalP>
        <LegalH2 color="#34d399">4. AdMob Advertising</LegalH2>
        <LegalP>StudiByte may use Google AdMob to display relevant advertisements. AdMob may use device identifiers to serve personalized ads. You can opt out of personalized ads in your device settings under Google → Ads.</LegalP>
        <LegalH2 color="#34d399">5. Data Protection</LegalH2>
        <LegalP>Your data is stored securely in Firebase Firestore with strict security rules. Only authenticated users can access their own data. We do not sell, rent, or share your personal information with third parties.</LegalP>
        <LegalH2 color="#34d399">6. Account & Login</LegalH2>
        <LegalP>Your account is protected by Firebase Authentication. You may delete your account at any time from Settings. All associated data will be permanently removed within 30 days.</LegalP>
        <LegalH2 color="#34d399">7. Contact</LegalH2>
        <LegalP>For any privacy concerns or data requests, contact us at support@adebyte.tech. We will respond within 48 hours.</LegalP>
      </LegalModal>

      {/* TERMS & CONDITIONS */}
      <LegalModal isOpen={modal === 'terms'} onClose={() => setModal(null)}
        title="Terms & Conditions" accentColor="#60a5fa"
        downloadName="StudiByte-Terms.txt" downloadContent={TERMS_TEXT}>
        <LegalH1>Terms & Conditions</LegalH1>
        <LegalP>Last updated: {new Date().toLocaleDateString()} · By using StudiByte, you agree to these terms.</LegalP>
        <LegalH2 color="#60a5fa">1. User Responsibilities</LegalH2>
        <LegalList items={['Provide accurate and truthful information','Keep your account credentials confidential','Use StudiByte only for lawful educational purposes','Respect other users and the platform integrity']} />
        <LegalH2 color="#60a5fa">2. Acceptable Use Policy</LegalH2>
        <LegalP>You must not:</LegalP>
        <LegalList items={['Share inappropriate, harmful, or offensive content','Attempt to hack, disrupt, or reverse-engineer the service','Create multiple accounts to abuse free features','Use the app to misrepresent academic information']} />
        <LegalH2 color="#60a5fa">3. Intellectual Property</LegalH2>
        <LegalP>All content, design, code, branding, and features of StudiByte are the intellectual property of ADEBYTE TECH (Adegbite Olaoluwa). You may not reproduce, distribute, or create derivative works without written permission.</LegalP>
        <LegalH2 color="#60a5fa">4. Account Suspension & Termination</LegalH2>
        <LegalP>ADEBYTE TECH reserves the right to suspend or permanently terminate accounts that violate these terms, engage in fraudulent activity, or misuse the platform in any way.</LegalP>
        <LegalH2 color="#60a5fa">5. Limitation of Liability</LegalH2>
        <LegalP>StudiByte is provided "as is" without warranty of any kind. ADEBYTE TECH is not liable for any academic outcomes, data loss, or damages arising from the use or inability to use the app.</LegalP>
        <LegalH2 color="#60a5fa">6. Educational Use Disclaimer</LegalH2>
        <LegalP>StudiByte is designed as an educational support tool. We make no guarantees of academic success, improved grades, or institutional compliance. Always verify academic rules with your institution.</LegalP>
        <LegalH2 color="#60a5fa">7. Changes to Terms</LegalH2>
        <LegalP>We may update these terms periodically. Continued use of StudiByte after changes constitutes acceptance of the new terms. Major changes will be communicated via in-app notification.</LegalP>
      </LegalModal>

      {/* ABOUT US */}
      <LegalModal isOpen={modal === 'about'} onClose={() => setModal(null)}
        title="About Us" accentColor="#fbbf24"
        downloadName="StudiByte-About.txt" downloadContent={ABOUT_TEXT}>
        <div className="rounded-2xl p-5 relative overflow-hidden" style={{ background: 'linear-gradient(135deg,rgba(251,191,36,0.1),rgba(245,158,11,0.05))', border: '1px solid rgba(251,191,36,0.2)' }}>
          <div className="absolute right-4 top-4 text-5xl opacity-15">🎓</div>
          <p className="text-[10px] font-black text-yellow-400 uppercase tracking-widest mb-2">ADEBYTE TECH</p>
          <h2 className="text-2xl font-black text-white mb-1" style={{ fontFamily: 'Georgia, serif' }}>StudiByte</h2>
          <p className="text-xs text-dark-400">Your Academic Companion · v3.0.0</p>
        </div>
        <LegalP>StudiByte is a modern student productivity and educational platform built to help students stay organized, productive, and academically focused. The app combines smart technology with learning tools to improve student performance and simplify academic life.</LegalP>
        <LegalH2 color="#fbbf24">The Founder</LegalH2>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-sm font-black text-white mb-1">Adegbite Olaoluwa</p>
          <p className="text-xs font-bold text-yellow-400 mb-2">ADEBYTE TECH · Web/App Developer</p>
          <LegalP>Founded by Adegbite Olaoluwa, popularly known as ADEBYTE TECH, StudiByte was created from a passion for technology and impacting knowledge positively. ADEBYTE TECH is a Web/App Developer who has partnered with thousands of business owners and educationists to create impactful digital solutions and educational experiences.</LegalP>
        </div>
        <LegalH2 color="#fbbf24">What We Offer</LegalH2>
        <LegalList items={['GPA Tracking — Supports multiple grading scales','Study Timer — Pomodoro technique for focused sessions','Assignment Management — Track all deadlines in one place','Attendance Tracking — Never fall below your target percentage','Course Materials — Upload PDFs, images, notes and links','Smart Reminders — Get notified before every class','AI-powered study assistance (coming soon)']} />
        <LegalH2 color="#fbbf24">Our Mission</LegalH2>
        <LegalP>StudiByte aims to empower students with the tools they need to succeed academically, stay organized, and build productive habits that last beyond university.</LegalP>
        <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs font-black text-green-400 mb-1">GET IN TOUCH</p>
          <p className="text-sm text-white">support@adebyte.tech</p>
          <p className="text-xs text-dark-400 mt-0.5">We love hearing from students!</p>
        </div>
      </LegalModal>

      {/* CONTACT & SUPPORT */}
      <LegalModal isOpen={modal === 'contact'} onClose={() => setModal(null)}
        title="Contact & Support" accentColor="#a78bfa"
        downloadName="StudiByte-Contact.txt"
        downloadContent="StudiByte Support\nEmail: support@adebyte.tech\nResponse time: 24-48 hours\nADEBYTE TECH | Founded by Adegbite Olaoluwa">
        <div className="rounded-2xl p-4" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
          <p className="text-xs font-black text-purple-400 uppercase tracking-widest mb-1">We're here for you</p>
          <p className="text-sm text-white font-bold">Student-centered support, always.</p>
          <p className="text-xs text-dark-400 mt-0.5">Average response time: 24–48 hours</p>
        </div>
        <ContactForm />
        <div className="rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-black text-dark-400 uppercase tracking-widest mb-3">Direct Contact</p>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <Mail size={14} className="text-green-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Email Support</p>
              <p className="text-sm font-bold text-green-400">support@adebyte.tech</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'rgba(96,165,250,0.1)' }}>
              <ExternalLink size={14} className="text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-dark-400">Developer</p>
              <p className="text-sm font-bold text-white">ADEBYTE TECH</p>
            </div>
          </div>
        </div>
      </LegalModal>

      {/* FAQ */}
      <LegalModal isOpen={modal === 'faq'} onClose={() => setModal(null)}
        title="FAQ" accentColor="#fb923c"
        downloadName="StudiByte-FAQ.txt" downloadContent={FAQ_TEXT}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)' }}>
          <p className="text-xs font-black text-orange-400 uppercase tracking-widest mb-1">Quick Answers</p>
          <p className="text-sm text-white font-bold">Everything you need to know about StudiByte</p>
        </div>
        <div className="space-y-2">
          {[
            { q: 'How do I reset my password?', a: 'Go to the login screen and tap "Forgot Password". Enter your registered email address and we\'ll send you a password reset link within a few minutes. Check your spam folder if you don\'t see it.' },
            { q: 'How does GPA tracking work?', a: 'Navigate to More → GPA Tracker. Add your courses with their credit units and grades. StudiByte automatically calculates your GPA and shows your semester and cumulative GPA. The grading scale can be configured to match your institution.' },
            { q: 'How do class reminders work?', a: 'Enable notifications in Settings → Notifications. Choose your preferred reminder times (10 mins, 30 mins, or 1 hour before class). StudiByte will send you a push notification before each scheduled class.' },
            { q: 'Can I use the app offline?', a: 'Yes! StudiByte uses Firebase offline caching, which means you can view your timetable, assignments, and other data without an internet connection. Any changes you make offline will automatically sync to the cloud when you reconnect.' },
            { q: 'What are premium features?', a: 'Premium features include unlimited course materials storage, advanced attendance analytics, priority customer support, and early access to new features like AI-powered study assistance. Free accounts get generous limits for all core features.' },
            { q: 'How does attendance tracking work?', a: 'After each class, go to the Attendance page and tap "Attended" or "Missed" for that course. StudiByte tracks your attendance percentage and warns you when you fall below the 75% minimum requirement, showing how many classes you need to attend to get back on track.' },
            { q: 'Is my data secure?', a: 'Absolutely. All your data is stored securely using Google Firebase with end-to-end encrypted connections and strict Firestore security rules. Only you can access your personal data — we cannot see or access your academic information.' },
            { q: 'How do I upload course materials?', a: 'Go to More → Course Materials and tap the + button. You can upload PDFs, images, write notes, or save links for any course. Files are stored securely in Firebase Storage and accessible from any device you log in with.' },
            { q: 'Can I use StudiByte on multiple devices?', a: 'Yes! StudiByte syncs your data across all devices where you log in with the same account. Your timetable, assignments, GPA, and materials are always up to date on every device.' },
          ].map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
        </div>
      </LegalModal>

      {/* DISCLAIMER */}
      <LegalModal isOpen={modal === 'disclaimer'} onClose={() => setModal(null)}
        title="Disclaimer" accentColor="#f87171"
        downloadName="StudiByte-Disclaimer.txt" downloadContent={DISCLAIMER_TEXT}>
        <div className="rounded-2xl p-4" style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
          <p className="text-xs font-black text-red-400 uppercase tracking-widest mb-1">Important Notices</p>
          <p className="text-sm text-white font-bold">Please read carefully before using StudiByte</p>
        </div>
        <LegalH2 color="#f87171">1. Educational Support Tool</LegalH2>
        <LegalP>StudiByte is a supplementary educational tool designed to support your academic journey. It is not a replacement for academic instruction, personal effort, professional tutoring, or official academic advice from your institution.</LegalP>
        <LegalH2 color="#f87171">2. No Guarantee of Academic Results</LegalH2>
        <LegalP>Using StudiByte does not guarantee improved grades, examination success, academic distinction, or any other academic outcome. Results depend entirely on individual effort, dedication, and personal circumstances beyond our control.</LegalP>
        <LegalH2 color="#f87171">3. AI-Generated Suggestions</LegalH2>
        <LegalP>Some features in StudiByte may include AI-powered suggestions, study tips, or academic recommendations. These are generated automatically by machine learning systems and should be used as guidance only. Always verify important academic decisions with your lecturers or academic advisors.</LegalP>
        <LegalH2 color="#f87171">4. Attendance Information</LegalH2>
        <LegalP>Attendance percentages shown in StudiByte are calculated based on data you enter manually. The app cannot automatically detect your physical presence in class. It is your responsibility to accurately record your attendance.</LegalP>
        <LegalH2 color="#f87171">5. GPA Calculations</LegalH2>
        <LegalP>GPA calculations in StudiByte use standard grading scales. However, your institution may use a different grading system. Always confirm your official GPA with your institution's academic records office.</LegalP>
        <LegalH2 color="#f87171">6. User Responsibility</LegalH2>
        <LegalList items={
          ['You are solely responsible for the accuracy of data you enter','You are responsible for all academic decisions made using this app','We are not liable for any academic penalties arising from reliance on app data','Always consult official academic resources for critical decisions']
        } />
        <LegalH2 color="#f87171">7. Availability</LegalH2>
        <LegalP>StudiByte is provided "as is". We do not guarantee uninterrupted service availability. Maintenance, updates, or technical issues may temporarily affect access to the app.</LegalP>
        <div className="rounded-2xl p-4 mt-2" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs text-dark-400 leading-relaxed">For questions or concerns, contact <span style={{ color: '#22c55e' }}>support@adebyte.tech</span>. ADEBYTE TECH · Founded by Adegbite Olaoluwa.</p>
        </div>
      </LegalModal>

      {/* ── LOGOUT CONFIRM ── */}
      <Modal isOpen={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Log Out">
        <div className="p-5 space-y-5 pb-8">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto"
            style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}>
            <LogOut size={28} className="text-red-400" />
          </div>
          <p className="text-center text-sm text-dark-300 leading-relaxed">
            You'll be signed out and taken to the login screen. Your data stays safe in the cloud.
          </p>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setShowLogoutConfirm(false)}>Cancel</Button>
            <button onClick={handleLogout} className="flex-1 py-3 rounded-2xl font-bold text-sm touch-manipulation"
              style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff' }}>Log Out</button>
          </div>
        </div>
      </Modal>

      {/* ── PIN SETUP ── */}
      <Modal isOpen={showPinSetup} onClose={() => setShowPinSetup(false)}
        title={pinStep === 'set' ? 'Set Your PIN' : 'Confirm PIN'}>
        <div className="pb-8">
          <p className="text-center text-sm text-dark-400 px-5 mt-2">
            {pinStep === 'set' ? 'Enter a 4-digit PIN to secure your account.' : 'Re-enter your PIN to confirm.'}
          </p>
          <PinDots length={4} filled={pinInput.length} />
          <AnimatePresence>
            {pinError && (
              <motion.p className="text-center text-xs text-red-400 font-medium mb-4"
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                {pinError}
              </motion.p>
            )}
          </AnimatePresence>
          <PinPad onDigit={handlePinDigit} onDelete={handlePinDelete} />
        </div>
      </Modal>

      {/* ── PROFILE MODAL ── */}
      <Modal isOpen={showProfile} onClose={() => setShowProfile(false)} title="Edit Profile" fullHeight>
        <div className="p-5 space-y-5 pb-10">
          <div className="flex flex-col items-center gap-3">
            <motion.div className="w-24 h-24 rounded-3xl overflow-hidden border-2 cursor-pointer relative group"
              style={{ borderColor: 'rgba(34,197,94,0.4)' }}
              onClick={() => avatarRef.current?.click()} whileTap={{ scale: 0.95 }}>
              {profileForm.avatar
                ? <img src={profileForm.avatar} alt="avatar" className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#22c55e,#065f46)' }}>
                    <span className="text-3xl font-black text-white">{initials}</span>
                  </div>
              }
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                style={{ background: 'rgba(0,0,0,0.5)' }}>
                <Camera size={20} className="text-white" />
              </div>
            </motion.div>
            <button onClick={() => avatarRef.current?.click()}
              className="text-xs font-bold px-3 py-1.5 rounded-xl touch-manipulation"
              style={{ border: '1px solid rgba(34,197,94,0.3)', color: '#4ade80' }}>
              Change Photo
            </button>
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); }} />
          </div>
          <Input label="Full Name" value={profileForm.fullName || ''} onChange={v => setP('fullName', v)} placeholder="e.g. Adebayo Johnson" required />
          <Input label="Matric / Student ID" value={profileForm.matricNumber || ''} onChange={v => setP('matricNumber', v)} placeholder="e.g. STU/2023/001" />
          <Select label="Department" value={profileForm.department || ''} onChange={v => setP('department', v)}
            options={[{ value: '', label: 'Select department...' }, ...DEPARTMENTS.map(d => ({ value: d, label: d }))]} />
          <Select label="Academic Level" value={profileForm.programLevel || DEFAULT_PROGRAM_LEVEL} onChange={v => setP('programLevel', v as ProgramLevel)}
            options={[{ value: '', label: 'Select level...' }, ...LEVEL_OPTIONS]} />
          <Select
            label="School CGPA Scale"
            value={String(profileForm.cgpaScale ?? DEFAULT_CGPA_SCALE)}
            onChange={v => setP('cgpaScale', parseFloat(v) as CgpaScale)}
            options={CGPA_SCALE_OPTIONS.map(o => ({ value: String(o.value), label: o.label }))}
          />
          <Select label="Current Semester" value={profileForm.currentSemester || 'First'} onChange={v => setP('currentSemester', v)}
            options={[{ value: 'First', label: 'First Semester' }, { value: 'Second', label: 'Second Semester' }]} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Semester Start" type="date" value={profileForm.semesterStartDate || ''} onChange={v => setP('semesterStartDate', v)} />
            <Input label="Semester End"   type="date" value={profileForm.semesterEndDate   || ''} onChange={v => setP('semesterEndDate', v)} />
          </div>
          <Input label="Target Attendance %" type="number" value={String(profileForm.targetAttendance || 75)}
            onChange={v => setP('targetAttendance', parseInt(v) || 75)} />
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setShowProfile(false)}>Cancel</Button>
            <Button fullWidth onClick={handleSaveProfile} disabled={saving || !profileForm.fullName?.trim()}>
              {saving ? (profileForm.avatar?.startsWith('data:') ? 'Uploading photo…' : 'Saving…') : 'Save Profile'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}