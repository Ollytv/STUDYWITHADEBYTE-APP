import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useStore } from './hooks/useStore';
import { useNotifications } from './hooks/useNotifications';
import { ROUTES, PUBLIC_PATHS, INNER_APP_PATHS, ADMIN_PATHS } from './routes';
import { RequireAdmin } from './components/admin/RequireAdmin';
import BottomNav from './components/layout/BottomNav';
import { NotificationAlert } from './components/ui/NotificationAlert';
import InstallPrompt from './components/ui/InstallPrompt';
import PullToRefresh from './components/ui/PullToRefresh';
import SplashScreen from './pages/SplashScreen';
import Landing from './pages/Landing';
import AuthScreen from './pages/AuthScreen';
import Onboarding from './pages/Onboarding';

// ── Lazy-loaded routes ────────────────────────────────────────────────────
// Kept eager: SplashScreen (Suspense fallback), Landing (SEO first paint),
// AuthScreen/Onboarding (critical path right after auth, no spinner wanted).
const Dashboard   = lazy(() => import('./pages/Dashboard'));
const Timetable   = lazy(() => import('./pages/Timetable'));
const Attendance  = lazy(() => import('./pages/Attendance'));
const Settings    = lazy(() => import('./pages/Settings'));
const More        = lazy(() => import('./pages/More'));
const ImportPage  = lazy(() => import('./pages/Import'));
const GPA         = lazy(() => import('./pages/GPA'));
const Timer       = lazy(() => import('./pages/Timer'));
const Assignments = lazy(() => import('./pages/Assignments'));
const Materials   = lazy(() => import('./pages/Materials'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));

const About    = lazy(() => import('./pages/public/About'));
const Features = lazy(() => import('./pages/public/Features'));
const FAQ      = lazy(() => import('./pages/public/FAQ'));
const Contact  = lazy(() => import('./pages/public/PublicPages').then(m => ({ default: m.Contact })));
const Privacy  = lazy(() => import('./pages/public/PublicPages').then(m => ({ default: m.Privacy })));
const Terms    = lazy(() => import('./pages/public/PublicPages').then(m => ({ default: m.Terms })));
const Support  = lazy(() => import('./pages/public/PublicPages').then(m => ({ default: m.Support })));

// Admin — separate from the student auth/onboarding flow entirely.
const AdminLogin        = lazy(() => import('./pages/admin/AdminLogin'));
const NotificationsAdmin = lazy(() => import('./pages/admin/NotificationsAdmin'));

export default function App() {
  const { authLoading, currentUser, hasProfile, initAuth, settings } = useStore();
  const [splashDone, setSplashDone] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (settings?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [settings?.theme]);

  // ── Gate 1: Splash ────────────────────────────────────────────────────
  if (!splashDone || authLoading) {
    return <SplashScreen />;
  }

  // ── Gate 1.5: Admin routes — entirely independent of student auth state ──
  // Admin login/authorization uses the same Firebase Auth project (see
  // useAdminAuth) but never touches currentUser/hasProfile/onboarding, so an
  // admin account doesn't need a student profile document to sign in here.
  if (ADMIN_PATHS.includes(location.pathname)) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path={ROUTES.adminLogin} element={<AdminLogin />} />
            <Route
              path={ROUTES.notificationsAdmin}
              element={
                <RequireAdmin>
                  <NotificationsAdmin />
                </RequireAdmin>
              }
            />
          </Routes>
        </Suspense>
      </div>
    );
  }

  // ── Gate 2: Logged out — public marketing site + auth ──────────────────
  if (!currentUser) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        <Suspense fallback={<SplashScreen />}>
          <Routes>
            <Route path={ROUTES.home}     element={<Landing onGetStarted={() => navigate(ROUTES.auth)} />} />
            <Route path={ROUTES.about}    element={<About />} />
            <Route path={ROUTES.features} element={<Features />} />
            <Route path={ROUTES.faq}      element={<FAQ />} />
            <Route path={ROUTES.contact}  element={<Contact />} />
            <Route path={ROUTES.privacy}  element={<Privacy />} />
            <Route path={ROUTES.terms}    element={<Terms />} />
            <Route path={ROUTES.support}  element={<Support />} />
            <Route path={ROUTES.auth}     element={<AuthScreen />} />
            {/* Unknown or protected path while logged out → Landing */}
            <Route path="*" element={<Navigate to={ROUTES.home} replace />} />
          </Routes>
        </Suspense>
        <InstallPrompt />
      </div>
    );
  }

  // ── Gate 3: Logged in, no profile yet → Onboarding ─────────────────────
  if (!hasProfile) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        <Routes>
          <Route path={ROUTES.onboarding} element={<Onboarding />} />
          <Route path="*" element={<Navigate to={ROUTES.onboarding} replace />} />
        </Routes>
        <InstallPrompt />
      </div>
    );
  }

  // ── Gate 4: Fully authenticated → App shell ────────────────────────────
  // Ignore public paths, /auth, /onboarding once fully set up — go to /app.
 // location already drives the <Routes> below via router context
  return (
    <Routes>
      <Route path={`${ROUTES.app.root}/*`} element={<MainApp />} />
      <Route path="*" element={<Navigate to={ROUTES.app.root} replace />} />
    </Routes>
  );
}

function MainApp() {
  const { settings, loadData } = useStore();
  const { alert, dismissAlert } = useNotifications();
  const location = useLocation();

  const showBottomNav = !INNER_APP_PATHS.includes(location.pathname);

  return (
    <div className={settings?.theme === 'dark' ? 'dark' : ''}>
      <NotificationAlert visible={alert.visible} payload={alert.payload} onDismiss={dismissAlert} />
      <InstallPrompt />
      <PullToRefresh onRefresh={loadData}>
        <div className="bg-dark-950 min-h-screen pb-20">
          <Suspense fallback={<SplashScreen />}>
            <Routes>
              <Route index              element={<Dashboard />} />
              <Route path="timetable"   element={<Timetable />} />
              <Route path="attendance"  element={<Attendance />} />
              <Route path="settings"    element={<Settings />} />
              <Route path="more"        element={<More />} />
              <Route path="import"      element={<ImportPage />} />
              <Route path="gpa"         element={<GPA />} />
              <Route path="timer"       element={<Timer />} />
              <Route path="assignments" element={<Assignments />} />
              <Route path="materials"   element={<Materials />} />
              <Route path="ai"          element={<AIAssistant />} />
              <Route path="*" element={<Navigate to={ROUTES.app.root} replace />} />
            </Routes>
          </Suspense>
          {showBottomNav && <BottomNav />}
        </div>
      </PullToRefresh>
    </div>
  );
}