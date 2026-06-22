import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, Share } from 'lucide-react';
import { useState } from 'react';
import { useInstallPrompt } from '../../hooks/useInstallPrompt';
import { Button } from './Button';

export function InstallBanner() {
  const { canInstall, isInstalled, isIOS, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled || dismissed) return null;
  if (!canInstall && !isIOS) return null;

  return (
    <>
      <AnimatePresence>
        {!dismissed && (
          <motion.div
            className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/20 p-4"
            initial={{ opacity: 0, y: -10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.97 }}
            transition={{ type: 'spring', bounce: 0.2 }}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                <Download size={18} className="text-green-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-white">Install StudyWithAdebyte</p>
                <p className="text-xs text-dark-400 font-body mt-0.5">
                  {isIOS ? 'Tap Share → Add to Home Screen' : 'Install for offline access & native feel'}
                </p>
                <div className="flex gap-2 mt-2.5">
                  {isIOS ? (
                    <Button
                      size="sm"
                      onClick={() => setShowIOSGuide(true)}
                      icon={<Share size={14} />}
                    >
                      How to install
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={install}
                      icon={<Download size={14} />}
                    >
                      Install
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                    Later
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setDismissed(true)}
                className="p-1 text-dark-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* iOS Install Guide */}
      <AnimatePresence>
        {showIOSGuide && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowIOSGuide(false)}
          >
            <motion.div
              className="w-full bg-dark-900 rounded-t-3xl border-t border-white/10 p-6 pb-10"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />
              <h3 className="text-xl font-display font-bold text-white mb-5">Install on iPhone</h3>
              <div className="space-y-4">
                {[
                  { step: '1', text: 'Tap the Share button at the bottom of Safari', icon: '↑' },
                  { step: '2', text: 'Scroll down and tap "Add to Home Screen"', icon: '+' },
                  { step: '3', text: 'Tap "Add" to confirm installation', icon: '✓' },
                ].map(item => (
                  <div key={item.step} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <p className="text-sm font-body text-dark-200 flex-1">{item.text}</p>
                  </div>
                ))}
              </div>
              <Button fullWidth size="lg" className="mt-6" onClick={() => setShowIOSGuide(false)}>
                Got it!
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
