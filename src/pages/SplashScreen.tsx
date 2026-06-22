import { motion } from 'framer-motion';
import { BookOpen } from 'lucide-react';

export default function SplashScreen() {
  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 overflow-hidden bg-brand-800"
      style={{ background: 'var(--color-brand-bg)' }}
    >
      {/* Subtle radial texture */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 80% 60% at 50% 0%, rgba(16,184,79,0.15) 0%, transparent 70%),' +
            'radial-gradient(ellipse 60% 50% at 80% 100%, rgba(6,95,42,0.4) 0%, transparent 60%)',
        }}
      />

      {/* Decorative circles */}
      <motion.div
        className="absolute top-[-64px] right-[-48px] w-56 h-56 rounded-full border border-white/5"
        style={{ background: 'rgba(255,255,255,0.04)' }}
        animate={{ scale: [1, 1.06, 1], rotate: [0, 8, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-[-48px] left-[-32px] w-44 h-44 rounded-full border border-white/5"
        style={{ background: 'rgba(255,255,255,0.03)' }}
        animate={{ scale: [1, 1.05, 1], rotate: [0, -6, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Floating dots */}
      {[
        { top: '14%', left: '8%',  size: 5, delay: 0    },
        { top: '22%', right: '10%', size: 3, delay: 0.5 },
        { top: '68%', left: '12%', size: 4, delay: 0.9  },
        { top: '58%', right: '8%', size: 6, delay: 0.2  },
      ].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full bg-white/20"
          style={{ width: d.size, height: d.size, top: d.top, left: (d as any).left, right: (d as any).right }}
          animate={{ opacity: [0.2, 0.7, 0.2], y: [0, -7, 0] }}
          transition={{ duration: 3, repeat: Infinity, delay: d.delay, ease: 'easeInOut' }}
        />
      ))}

      {/* Main content */}
      <motion.div
        className="relative z-10 flex flex-col items-center"
        initial={{ opacity: 0, scale: 0.88, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 20, stiffness: 180 }}
      >
        {/* Icon with pulse ring */}
        <div className="relative mb-8">
          <motion.div
            className="absolute rounded-3xl bg-white/10"
            style={{ inset: -12 }}
            animate={{ scale: [1, 1.14, 1], opacity: [0.4, 0.1, 0.4] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="w-28 h-28 rounded-3xl flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1.5px solid rgba(255,255,255,0.22)',
              backdropFilter: 'blur(8px)',
            }}
            animate={{ y: [0, -5, 0] }}
            transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
          >
            <BookOpen size={48} color="white" strokeWidth={1.6} />
          </motion.div>
        </div>

        {/* Brand name */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22 }}
        >
          <h1
            className="font-display font-bold text-white"
            style={{ fontSize: 30, letterSpacing: '-0.5px', lineHeight: 1.1 }}
          >
            Studi<span style={{ opacity: 0.75 }}>Byte</span>
          </h1>
          <p className="text-white/50 font-body text-sm mt-2 tracking-wider">
            Student Smart Companion
          </p>
        </motion.div>

        {/* Feature pills */}
        <motion.div
          className="flex gap-2 mt-6 flex-wrap justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {['Timetable', 'GPA Tracker', 'Assignments', 'Study Timer'].map((label, i) => (
            <motion.span
              key={label}
              className="px-3 py-1 rounded-full font-body text-xs font-medium text-white/70"
              style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.14)' }}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 + i * 0.07 }}
            >
              {label}
            </motion.span>
          ))}
        </motion.div>
      </motion.div>

      {/* Loading bar */}
      <motion.div
        className="absolute bottom-14 left-0 right-0 flex flex-col items-center gap-2.5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55 }}
      >
        <div
          className="w-36 h-0.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <motion.div
            className="h-full rounded-full bg-white/70"
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 2.2, ease: 'easeInOut', delay: 0.65 }}
          />
        </div>
        <p className="text-white/30 font-body text-xs">Setting up your workspace…</p>
      </motion.div>
    </div>
  );
}