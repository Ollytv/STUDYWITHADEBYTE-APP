import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { ReactNode, useEffect } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  fullHeight?: boolean;
}

export function Modal({ isOpen, onClose, title, children, fullHeight = false }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet
            ─ WHY inline style instead of Tailwind classes for left/right/width:
              Framer Motion applies a CSS transform (translateY) to animate the
              sheet in/out. On some Android WebViews and older iOS Safari,
              combining CSS transforms with Tailwind's `left-0 right-0` shorthand
              causes the browser to recalculate the containing block mid-animation,
              producing 1–3px lateral drift. Explicit inline left/right/width
              bypasses that recalculation path entirely.
          */}
          <motion.div
            className={`
              fixed bottom-0 z-[60]
              bg-dark-900 rounded-t-3xl border-t border-white/10
              flex flex-col
              ${fullHeight ? 'h-[92vh]' : 'max-h-[92vh]'}
            `}
            style={{
              // Pin to full viewport width — explicit values prevent
              // fractional-pixel rounding that Tailwind classes can produce
              // on high-DPI screens with odd viewport widths
              left: 0,
              right: 0,
              width: '100%',
              maxWidth: '100%',
              // Clip any child that overflows horizontally — if an input,
              // grid, or absolute-positioned element is wider than the modal,
              // this stops it creating a horizontal scrollbar on the whole sheet
              overflowX: 'hidden',
              // Respect device safe-area insets (notch phones, rounded corners).
              // Left/right insets matter on landscape orientation — without these
              // content can sit behind the rounded screen corners
              paddingLeft: 'env(safe-area-inset-left, 0px)',
              paddingRight: 'env(safe-area-inset-right, 0px)',
              // Create an isolated stacking context so Framer Motion's
              // transform doesn't affect sibling elements' layout
              isolation: 'isolate',
              // Guarantee padding never adds to declared width
              boxSizing: 'border-box',
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 350 }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1 shrink-0">
              <div className="w-10 h-1 rounded-full bg-white/20" />
            </div>

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/5 shrink-0">
                <h2 className="text-lg font-display font-semibold text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-white/8 transition-colors text-dark-400 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>
            )}

            {/* Content
              ─ overscroll-contain stops scroll events bubbling to the page
                behind the modal (prevents background scrolling on iOS)
              ─ min-w-0 is critical: without it, a flex child can expand past
                its parent when it contains wide content like inputs or grids
            */}
            <div
              className="flex-1 overflow-y-auto overflow-x-hidden overscroll-contain min-w-0 w-full"
              style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}