import { useEffect, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';

/**
 * Theme-aware bottom sheet. Render inside <AnimatePresence> so it animates out.
 * z-[60] keeps it above the bottom nav (see the z-index ladder in index.css).
 */
export function BottomSheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <motion.div className="fixed inset-0 z-[60] flex items-end justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose} />
      <motion.div
        role="dialog" aria-modal="true" aria-label={title}
        className="relative w-full max-w-lg rounded-t-3xl modal-shell"
        style={{
          background: 'var(--bg-elevated)', border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-card-hover)', maxHeight: '90dvh',
        }}
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 32, stiffness: 320 }}>
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-lg font-black text-content-primary" style={{ fontFamily: 'Georgia, serif' }}>{title}</h2>
          <button onClick={onClose} aria-label="Close"
            className="w-8 h-8 rounded-xl flex items-center justify-center text-content-muted"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }}>
            <X size={16} />
          </button>
        </div>
        <div className="modal-scroll px-5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>
          {children}
        </div>
      </motion.div>
    </motion.div>
  );
}
