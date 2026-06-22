// src/App.tsx
import { useEffect, useState } from 'react';
import { useStore } from './hooks/useStore';
import { useNotifications } from './hooks/useNotifications';
import BottomNav from './components/layout/BottomNav';
import { NotificationAlert } from './components/ui/NotificationAlert';
import InstallPrompt from './components/ui/InstallPrompt';
import Dashboard from './pages/Dashboard';
import Timetable from './pages/Timetable';
import Attendance from './pages/Attendance';
import Import from './pages/Import';
import Settings from './pages/Settings';
import More from './pages/More';
import Onboarding from './pages/Onboarding';
import AuthScreen from './pages/AuthScreen';
import SplashScreen from './pages/SplashScreen';
import Materials from './pages/Materials';
import Assignments from './pages/Assignments';
import Timer from './pages/Timer';
import GPA from './pages/GPA';

export default function App() {
  const { activeTab, authLoading, currentUser, hasProfile, initAuth, settings } = useStore();
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    const unsubscribe = initAuth();
    return unsubscribe;
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSplashDone(true), 1500);
    return () => clearTimeout(t);
  }, []);

  // Apply dark/light class to <html> so Tailwind dark: works globally
  useEffect(() => {
    if (settings?.theme === 'light') {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [settings?.theme]);

  // ── Gate 1: Splash + Firebase auth resolving ──────────────────────────────
  if (!splashDone || authLoading) {
    return <SplashScreen />;
  }

  // ── Gate 2: No Firebase user → Login/Signup ───────────────────────────────
  if (!currentUser) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        <AuthScreen />
        {/* Mounted on every post-splash screen so it can appear on first
            visit regardless of whether the visitor has signed in yet. */}
        <InstallPrompt />
      </div>
    );
  }

  // ── Gate 3: Logged in but no Firestore profile → Onboarding ──────────────
  if (!hasProfile) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        <Onboarding />
        <InstallPrompt />
      </div>
    );
  }

  // ── Gate 4: Fully authenticated + onboarded → Main app ───────────────────
  return <MainApp />;
}

// Separated so useNotifications only runs when fully authenticated
// (it reads classes + settings from the store which aren't loaded until then)
function MainApp() {
  const { activeTab, settings } = useStore();
  const { alert, dismissAlert } = useNotifications();

  const isInnerPage = ['gpa', 'timer', 'assignments', 'materials'].includes(activeTab);

  return (
    <div className={settings?.theme === 'dark' ? 'dark' : ''}>
      {/* Global in-app notification popup — always mounted, z-[70] */}
      <NotificationAlert
        visible={alert.visible}
        payload={alert.payload}
        onDismiss={dismissAlert}
      />

      {/* First-visit "Install StudiByte" popup — z-[100], self-gating via
          localStorage + install detection, so it's safe to always mount. */}
      <InstallPrompt />

      <div className="bg-dark-950 min-h-screen pb-20">
        {activeTab === 'dashboard'   && <Dashboard />}
        {activeTab === 'timetable'   && <Timetable />}
        {activeTab === 'attendance'  && <Attendance />}
        {activeTab === 'import'      && <Import />}
        {activeTab === 'settings'    && <Settings />}
        {activeTab === 'more'        && <More />}
        {activeTab === 'gpa'         && <GPA />}
        {activeTab === 'timer'       && <Timer />}
        {activeTab === 'assignments' && <Assignments />}
        {activeTab === 'materials'   && <Materials />}
        {!isInnerPage && <BottomNav />}
      </div>
    </div>
  );
}