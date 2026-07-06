"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstallBanner = InstallBanner;
const framer_motion_1 = require("framer-motion");
const lucide_react_1 = require("lucide-react");
const react_1 = require("react");
const useInstallPrompt_1 = require("../../hooks/useInstallPrompt");
const Button_1 = require("./Button");
function InstallBanner() {
    const { canInstall, isInstalled, isIOS, install } = (0, useInstallPrompt_1.useInstallPrompt)();
    const [dismissed, setDismissed] = (0, react_1.useState)(false);
    const [showIOSGuide, setShowIOSGuide] = (0, react_1.useState)(false);
    if (isInstalled || dismissed)
        return null;
    if (!canInstall && !isIOS)
        return null;
    return (<>
      <framer_motion_1.AnimatePresence>
        {!dismissed && (<framer_motion_1.motion.div className="mx-4 mb-4 rounded-2xl bg-gradient-to-r from-green-500/15 to-emerald-500/10 border border-green-500/20 p-4" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -10, scale: 0.97 }} transition={{ type: 'spring', bounce: 0.2 }}>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-green-500/20 flex items-center justify-center shrink-0">
                <lucide_react_1.Download size={18} className="text-green-400"/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-semibold text-white">Install StudyWithAdebyte</p>
                <p className="text-xs text-dark-400 font-body mt-0.5">
                  {isIOS ? 'Tap Share → Add to Home Screen' : 'Install for offline access & native feel'}
                </p>
                <div className="flex gap-2 mt-2.5">
                  {isIOS ? (<Button_1.Button size="sm" onClick={() => setShowIOSGuide(true)} icon={<lucide_react_1.Share size={14}/>}>
                      How to install
                    </Button_1.Button>) : (<Button_1.Button size="sm" onClick={install} icon={<lucide_react_1.Download size={14}/>}>
                      Install
                    </Button_1.Button>)}
                  <Button_1.Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                    Later
                  </Button_1.Button>
                </div>
              </div>
              <button onClick={() => setDismissed(true)} className="p-1 text-dark-500 hover:text-white transition-colors">
                <lucide_react_1.X size={16}/>
              </button>
            </div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>

      {/* iOS Install Guide */}
      <framer_motion_1.AnimatePresence>
        {showIOSGuide && (<framer_motion_1.motion.div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowIOSGuide(false)}>
            <framer_motion_1.motion.div className="w-full bg-dark-900 rounded-t-3xl border-t border-white/10 p-6 pb-10" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 28, stiffness: 300 }} onClick={e => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5"/>
              <h3 className="text-xl font-display font-bold text-white mb-5">Install on iPhone</h3>
              <div className="space-y-4">
                {[
                { step: '1', text: 'Tap the Share button at the bottom of Safari', icon: '↑' },
                { step: '2', text: 'Scroll down and tap "Add to Home Screen"', icon: '+' },
                { step: '3', text: 'Tap "Add" to confirm installation', icon: '✓' },
            ].map(item => (<div key={item.step} className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-green-500/15 border border-green-500/30 flex items-center justify-center">
                      <span className="text-lg">{item.icon}</span>
                    </div>
                    <p className="text-sm font-body text-dark-200 flex-1">{item.text}</p>
                  </div>))}
              </div>
              <Button_1.Button fullWidth size="lg" className="mt-6" onClick={() => setShowIOSGuide(false)}>
                Got it!
              </Button_1.Button>
            </framer_motion_1.motion.div>
          </framer_motion_1.motion.div>)}
      </framer_motion_1.AnimatePresence>
    </>);
}
//# sourceMappingURL=InstallBanner.js.map