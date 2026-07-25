// src/pages/WelcomeIntro.tsx
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useRef, useState } from 'react';
import { ChevronRight, Sparkles, BookOpen, TrendingUp, Users } from 'lucide-react';
import { ROUTES } from '../routes';

const TRACK_WIDTH = 280;
const HANDLE_SIZE = 52;
const DRAG_THRESHOLD = 0.75; // fraction of track width to trigger navigation

// ── Original hand-drawn illustration ───────────────────────────────────────
// Built entirely from primitive SVG shapes (no external asset, no stock
// photo, no third-party icon set) — a student reading at a desk, in the
// app's own brand colors. Free of copyright/licensing concerns by
// construction.
function StudyIllustration() {
  return (
    <svg viewBox="0 0 320 280" className="w-full h-full" aria-hidden="true">
      <defs>
        <radialGradient id="glow" cx="50%" cy="45%" r="60%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="deskGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1a24" />
          <stop offset="100%" stopColor="#141420" />
        </linearGradient>
      </defs>

      <circle cx="160" cy="130" r="140" fill="url(#glow)" />

      {/* Desk */}
      <rect x="40" y="200" width="240" height="14" rx="7" fill="url(#deskGrad)" />
      <rect x="55" y="214" width="10" height="40" rx="3" fill="#1a1a24" />
      <rect x="255" y="214" width="10" height="40" rx="3" fill="#1a1a24" />

      {/* Open book */}
      <g>
        <path d="M100 196 L158 186 L158 150 L100 158 Z" fill="#22c55e" opacity="0.9" />
        <path d="M158 186 L216 196 L216 158 L158 150 Z" fill="#16a34a" opacity="0.9" />
        <path d="M104 190 L154 182" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <path d="M104 178 L154 171" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <path d="M162 182 L212 190" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
        <path d="M162 171 L212 178" stroke="#0a0a0f" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
      </g>

      {/* Laptop, slightly behind the book */}
      <g opacity="0.9">
        <path d="M195 198 L268 198 L260 160 L203 160 Z" fill="#2a2a38" />
        <path d="M203 160 L260 160 L256 154 L207 154 Z" fill="#38384a" />
        <rect x="206" y="163" width="51" height="30" rx="2" fill="#4ade80" opacity="0.15" />
      </g>

      {/* Character — simplified seated figure */}
      <g>
        {/* body */}
        <path d="M120 200 C118 172 132 150 160 150 C188 150 202 172 200 200 Z" fill="#a855f7" opacity="0.9" />
        {/* head */}
        <circle cx="160" cy="122" r="26" fill="#f4c9a1" />
        {/* hair */}
        <path d="M134 116 C132 96 148 84 160 84 C172 84 188 96 186 116 C182 106 172 100 160 100 C148 100 138 106 134 116 Z" fill="#2a1a10" />
        {/* arm reading */}
        <path d="M140 172 C132 178 126 186 124 196" stroke="#a855f7" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.9" />
        <path d="M180 172 C188 178 194 186 196 196" stroke="#a855f7" strokeWidth="14" strokeLinecap="round" fill="none" opacity="0.9" />
      </g>

      {/* Floating sparkles — animated natively via SVG SMIL, no JS needed */}
      <g>
        <path d="M246 90 l4 10 10 4 -10 4 -4 10 -4 -10 -10 -4 10 -4 Z" fill="#fbbf24">
          <animate attributeName="opacity" values="0.3;0.9;0.3" dur="2.2s" repeatCount="indefinite" />
        </path>
      </g>
      <g>
        <circle cx="70" cy="100" r="4" fill="#22c55e">
          <animate attributeName="opacity" values="0.7;0.2;0.7" dur="2.6s" repeatCount="indefinite" />
        </circle>
      </g>
      <g>
        <circle cx="252" cy="150" r="3" fill="#a855f7">
          <animate attributeName="opacity" values="0.7;0.15;0.7" dur="1.9s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  );
}

export default function WelcomeIntro() {
  const navigate = useNavigate();
  const trackRef = useRef<HTMLDivElement>(null);
  const [completed, setCompleted] = useState(false);

  const x = useMotionValue(0);
  const maxDrag = TRACK_WIDTH - HANDLE_SIZE - 8;
  const fillWidth = useTransform(x, [0, maxDrag], [HANDLE_SIZE, TRACK_WIDTH]);
  const hintOpacity = useTransform(x, [0, maxDrag * 0.4], [1, 0]);

  function goToAuth() {
    setCompleted(true);
    navigate(ROUTES.auth);
  }

  function handleDragEnd() {
    if (x.get() >= maxDrag * DRAG_THRESHOLD) {
      animate(x, maxDrag, { type: 'spring', stiffness: 300, damping: 30, onComplete: goToAuth });
    } else {
      animate(x, 0, { type: 'spring', stiffness: 400, damping: 32 });
    }
  }

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col relative overflow-hidden">
      {/* ── Ambient background glow ──────────────────────────────────────── */}
      <div className="absolute -top-24 -right-16 w-72 h-72 rounded-full opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #22c55e, transparent 70%)' }} />
      <div className="absolute top-1/3 -left-20 w-64 h-64 rounded-full opacity-10 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #a855f7, transparent 70%)' }} />

      {/* ── Sticky header — stays pinned while the rest of the page scrolls,
             same pattern as AuthScreen's header. Safe-area aware so it sits
             below the notch/status bar on every device. ─────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-20 flex items-center gap-2 px-5 sm:px-6"
        style={{
          paddingTop: 'calc(env(safe-area-inset-top, 0px) + 1.25rem)',
          paddingBottom: '1rem',
          background: 'rgba(10,10,15,0.75)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center flex-shrink-0">
          <Sparkles size={15} className="text-dark-950" />
        </div>
        <span className="text-base font-black text-white font-display">StudiByte</span>
      </motion.div>

      {/* ── Centered, responsive column — caps width on tablets/desktop ──── */}
      <div className="relative flex-1 flex flex-col items-center w-full px-5 sm:px-6 pt-6 pb-10 mx-auto max-w-md">
        {/* ── Illustration — floats gently, centered in the available space ── */}
        <motion.div
          className="w-full flex-1 flex items-center justify-center my-6 max-h-[200px] sm:max-h-[280px]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
        >
          <motion.div
            className="w-full max-w-[220px] sm:max-w-xs"
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
          >
            <StudyIllustration />
          </motion.div>
        </motion.div>

        <motion.div
          className="w-full text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <p className="text-[10px] font-bold text-green-400 uppercase tracking-widest mb-2">
            AI-Powered Academic Platform
          </p>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-display leading-tight mb-3" style={{ letterSpacing: '-0.5px' }}>
            Study Smarter,<br />
            <span style={{ color: '#4ade80' }}>Score Higher.</span>
          </h1>
          <p className="text-sm text-dark-400 font-body leading-relaxed mx-auto max-w-xs">
            Track your timetable, GPA, and assignments — and let daily study bytes keep you exam-ready without the overwhelm.
          </p>
        </motion.div>

        <motion.div
          className="flex flex-wrap justify-center gap-2 mt-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          {[
            { icon: BookOpen, label: 'Exam Prep' },
            { icon: TrendingUp, label: 'GPA Tracker' },
            { icon: Users, label: 'Study Squads' },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.15)' }}>
              <Icon size={11} className="text-green-400" />
              <span className="text-xs font-semibold text-green-300 font-body">{label}</span>
            </div>
          ))}
        </motion.div>

        {/* ── Swipe-to-start control ─────────────────────────────────────── */}
        <motion.div
          className="mt-10 w-full flex flex-col items-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.45 }}
        >
          <div
            ref={trackRef}
            className="relative rounded-full flex items-center px-1"
            style={{ width: TRACK_WIDTH, maxWidth: '100%', height: HANDLE_SIZE + 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <motion.div
              className="absolute left-1 top-1 rounded-full pointer-events-none"
              style={{ width: fillWidth, height: HANDLE_SIZE, background: 'linear-gradient(135deg, rgba(34,197,94,0.25), rgba(22,163,74,0.15))' }}
            />
            <motion.p
              className="absolute inset-0 flex items-center justify-center text-xs font-semibold text-dark-300 font-body pointer-events-none"
              style={{ opacity: hintOpacity }}
            >
              Swipe to Get Started
            </motion.p>
            <motion.div
              className="absolute rounded-full pointer-events-none"
              style={{ width: HANDLE_SIZE, height: HANDLE_SIZE, left: 4, top: 4, border: '2px solid rgba(74,222,128,0.5)' }}
              animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.button
              type="button"
              aria-label="Swipe to get started"
              drag={completed ? false : 'x'}
              dragConstraints={{ left: 0, right: maxDrag }}
              dragElastic={0.05}
              onDragEnd={handleDragEnd}
              onClick={goToAuth}
              style={{ x, width: HANDLE_SIZE, height: HANDLE_SIZE, background: '#4ade80' }}
              className="relative z-10 rounded-full flex items-center justify-center touch-manipulation cursor-grab active:cursor-grabbing"
              whileTap={{ scale: 0.94 }}
            >
              <ChevronRight size={22} className="text-dark-950" strokeWidth={2.5} />
            </motion.button>
          </div>

          <button
            onClick={goToAuth}
            className="text-center text-xs text-dark-500 hover:text-dark-300 mt-4 font-body transition-colors"
          >
            or tap to continue
          </button>
        </motion.div>
      </div>
    </div>
  );
}