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
import Landing from './pages/Landing';
import Materials from './pages/Materials';
import Assignments from './pages/Assignments';
import Timer from './pages/Timer';
import GPA from './pages/GPA';
import AIAssistant from './pages/AIAssistant';

export default function App() {
  const { activeTab, authLoading, currentUser, hasProfile, initAuth, settings } = useStore();
  const [splashDone, setSplashDone]   = useState(false);
  // showAuth: false = show Landing, true = show AuthScreen
  // Persisted in sessionStorage so Back from auth doesn't reset to landing
  const [showAuth, setShowAuth]       = useState(false);

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

  // ── Gate 2: No Firebase user → Landing or AuthScreen ─────────────────────
  if (!currentUser) {
    return (
      <div className="dark bg-dark-950 min-h-screen">
        {showAuth
          ? <AuthScreen />
          : <Landing onGetStarted={() => setShowAuth(true)} />
        }
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
function MainApp() {
  const { activeTab, settings } = useStore();
  const { alert, dismissAlert } = useNotifications();

  const isInnerPage = ['gpa', 'timer', 'assignments', 'materials', 'ai'].includes(activeTab);

  return (
    <div className={settings?.theme === 'dark' ? 'dark' : ''}>
      <NotificationAlert
        visible={alert.visible}
        payload={alert.payload}
        onDismiss={dismissAlert}
      />
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
        {activeTab === 'ai'          && <AIAssistant />}
        {!isInnerPage && <BottomNav />}
      </div>
    </div>
  );
}