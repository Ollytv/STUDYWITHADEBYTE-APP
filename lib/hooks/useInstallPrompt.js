"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useInstallPrompt = useInstallPrompt;
const react_1 = require("react");
function useInstallPrompt() {
    const [installPrompt, setInstallPrompt] = (0, react_1.useState)(null);
    const [isInstalled, setIsInstalled] = (0, react_1.useState)(false);
    const [isIOS, setIsIOS] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        // Check if already installed
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            window.navigator.standalone === true;
        setIsInstalled(isStandalone);
        // Detect iOS
        const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
        setIsIOS(ios);
        const handler = (e) => {
            e.preventDefault();
            setInstallPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setInstallPrompt(null);
        });
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);
    const install = async () => {
        if (!installPrompt)
            return false;
        await installPrompt.prompt();
        const { outcome } = await installPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallPrompt(null);
            setIsInstalled(true);
        }
        return outcome === 'accepted';
    };
    return { installPrompt, isInstalled, isIOS, install, canInstall: !!installPrompt };
}
//# sourceMappingURL=useInstallPrompt.js.map