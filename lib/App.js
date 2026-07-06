"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = App;
// src/App.tsx
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const useStore_1 = require("./hooks/useStore");
const useNotifications_1 = require("./hooks/useNotifications");
const BottomNav_1 = __importDefault(require("./components/layout/BottomNav"));
const NotificationAlert_1 = require("./components/ui/NotificationAlert");
const InstallPrompt_1 = __importDefault(require("./components/ui/InstallPrompt"));
const Dashboard_1 = __importDefault(require("./pages/Dashboard"));
const Timetable_1 = __importDefault(require("./pages/Timetable"));
const Attendance_1 = __importDefault(require("./pages/Attendance"));
const Settings_1 = __importDefault(require("./pages/Settings"));
const More_1 = __importDefault(require("./pages/More"));
const Onboarding_1 = __importDefault(require("./pages/Onboarding"));
const AuthScreen_1 = __importDefault(require("./pages/AuthScreen"));
const SplashScreen_1 = __importDefault(require("./pages/SplashScreen"));
const Import_1 = __importDefault(require("./pages/Import"));
const Landing_1 = __importDefault(require("./pages/Landing"));
const Materials_1 = __importDefault(require("./pages/Materials"));
const Assignments_1 = __importDefault(require("./pages/Assignments"));
const Timer_1 = __importDefault(require("./pages/Timer"));
const GPA_1 = __importDefault(require("./pages/GPA"));
const AIAssistant_1 = __importDefault(require("./pages/AIAssistant"));
// Public route pages
const About_1 = __importDefault(require("./pages/public/About"));
const Features_1 = __importDefault(require("./pages/public/Features"));
const FAQ_1 = __importDefault(require("./pages/public/FAQ"));
const PublicPages_1 = require("./pages/public/PublicPages");
function App() {
    const { authLoading, currentUser, hasProfile, initAuth, settings } = (0, useStore_1.useStore)();
    const [splashDone, setSplashDone] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    (0, react_1.useEffect)(() => {
        const unsubscribe = initAuth();
        return unsubscribe;
    }, []);
    (0, react_1.useEffect)(() => {
        const t = setTimeout(() => setSplashDone(true), 1500);
        return () => clearTimeout(t);
    }, []);
    (0, react_1.useEffect)(() => {
        if (settings?.theme === 'light') {
            document.documentElement.classList.remove('dark');
        }
        else {
            document.documentElement.classList.add('dark');
        }
    }, [settings?.theme]);
    // ── Gate 1: Splash ────────────────────────────────────────────────────────
    if (!splashDone || authLoading) {
        return <SplashScreen_1.default />;
    }
    // ── Public routes — always accessible, even when logged out ───────────────
    // These are rendered BEFORE the auth gate so Google can crawl them.
    // The nav "Get Started" button navigates to "/" which shows Landing.
    const PUBLIC_PATHS = ['/', '/about', '/features', '/faq', '/contact', '/privacy', '/terms', '/support'];
    const isPublicRoute = PUBLIC_PATHS.includes(location.pathname);
    // If no user and we're on a public sub-page (/about etc.) → render it
    // If no user and on / → show Landing (or AuthScreen if they clicked Get Started)
    if (!currentUser && isPublicRoute) {
        const handleGetStarted = () => navigate('/_auth');
        return (<div className="dark bg-dark-950 min-h-screen">
        <react_router_dom_1.Routes>
          <react_router_dom_1.Route path="/" element={<Landing_1.default onGetStarted={handleGetStarted}/>}/>
          <react_router_dom_1.Route path="/about" element={<About_1.default />}/>
          <react_router_dom_1.Route path="/features" element={<Features_1.default />}/>
          <react_router_dom_1.Route path="/faq" element={<FAQ_1.default />}/>
          <react_router_dom_1.Route path="/contact" element={<PublicPages_1.Contact />}/>
          <react_router_dom_1.Route path="/privacy" element={<PublicPages_1.Privacy />}/>
          <react_router_dom_1.Route path="/terms" element={<PublicPages_1.Terms />}/>
          <react_router_dom_1.Route path="/support" element={<PublicPages_1.Support />}/>
          {/* Fallback — unknown paths go to Landing */}
          <react_router_dom_1.Route path="*" element={<Landing_1.default onGetStarted={handleGetStarted}/>}/>
        </react_router_dom_1.Routes>
        <InstallPrompt_1.default />
      </div>);
    }
    // ── Auth screen — reached via Get Started button or direct /_auth ─────────
    if (!currentUser) {
        return (<div className="dark bg-dark-950 min-h-screen">
        <AuthScreen_1.default />
        <InstallPrompt_1.default />
      </div>);
    }
    // ── Gate 3: Logged in but no profile → Onboarding ────────────────────────
    if (!hasProfile) {
        return (<div className="dark bg-dark-950 min-h-screen">
        <Onboarding_1.default />
        <InstallPrompt_1.default />
      </div>);
    }
    // ── Gate 4: Fully authenticated → Main app ────────────────────────────────
    return <MainApp />;
}
function MainApp() {
    const { activeTab, settings } = (0, useStore_1.useStore)();
    const { alert, dismissAlert } = (0, useNotifications_1.useNotifications)();
    const isInnerPage = ['gpa', 'timer', 'assignments', 'materials', 'ai'].includes(activeTab);
    return (<div className={settings?.theme === 'dark' ? 'dark' : ''}>
      <NotificationAlert_1.NotificationAlert visible={alert.visible} payload={alert.payload} onDismiss={dismissAlert}/>
      <InstallPrompt_1.default />
      <div className="bg-dark-950 min-h-screen pb-20">
        {activeTab === 'dashboard' && <Dashboard_1.default />}
        {activeTab === 'timetable' && <Timetable_1.default />}
        {activeTab === 'attendance' && <Attendance_1.default />}
        {activeTab === 'settings' && <Settings_1.default />}
        {activeTab === 'more' && <More_1.default />}
        {activeTab === 'import' && <Import_1.default />}
        {activeTab === 'gpa' && <GPA_1.default />}
        {activeTab === 'timer' && <Timer_1.default />}
        {activeTab === 'assignments' && <Assignments_1.default />}
        {activeTab === 'materials' && <Materials_1.default />}
        {activeTab === 'ai' && <AIAssistant_1.default />}
        {!isInnerPage && <BottomNav_1.default />}
      </div>
    </div>);
}
//# sourceMappingURL=App.js.map