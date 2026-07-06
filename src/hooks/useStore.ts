import { create } from 'zustand';
import { persist } from 'zustand/middleware';
// import line — remove TabRoute
import {
  CourseClass, AttendanceRecord, StudentProfile, AppSettings,
  GPACourse, Assignment, StudySession, CourseMaterial, Semester,
  DEFAULT_PROGRAM_LEVEL, DEFAULT_CGPA_SCALE,
} from '../types';
import * as db from '../services/db';
import { signUp as fbSignUp, signIn as fbSignIn, signOut as fbSignOut, resetPassword as fbResetPassword, onAuthChange, AuthUser } from '../services/auth';
import { generateId } from '../utils/id';

type AppSettingsExtended = AppSettings & { pin?: string };

const DEFAULT_SETTINGS: AppSettingsExtended = {
  theme: 'dark',
  notifications: { enabled: false, tenMinsBefore: true, thirtyMinsBefore: true, oneHourBefore: false, sound: true },
  firstLaunch: true,
  onboardingComplete: false,
  dataVersion: 3,
  pin: '',
};

const PERSIST_KEY = 'studywithadebyte-v3';

/**
 * Coerce any fields that must be numeric but may have been stored as strings
 * due to the Select → onChange → string pipeline.
 * Specifically: cgpaScale comes back as "3", "4", or "5" from the DOM and
 * may have been written to Firestore as a string before this fix was applied.
 * Calling Number() here heals both old and new documents transparently.
 */
function normaliseProfile(p: StudentProfile | undefined): StudentProfile | undefined {
  if (!p) return p;
  return {
    ...p,
    cgpaScale: p.cgpaScale !== undefined
      ? (Number(p.cgpaScale) as StudentProfile['cgpaScale'])
      : DEFAULT_CGPA_SCALE,
  };
}

// Only used to persist theme preference across sessions — nothing routing-critical
function patchPersistedSettings(patch: Partial<AppSettingsExtended>) {
  try {
    const raw = localStorage.getItem(PERSIST_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    parsed.state = parsed.state || {};
    parsed.state.settings = { ...(parsed.state.settings || {}), ...patch };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(parsed));
  } catch (e) { console.error('patchPersistedSettings:', e); }
}

interface AppState {
  // ── Auth ───────────────────────────────────────────────────────────────────
  currentUser: AuthUser | null;
  authLoading: boolean;   // true until Firebase resolves auth state on boot
  authError: string;
  hasProfile: boolean;    // true if Firestore profile doc exists for this user

  // ── Data ───────────────────────────────────────────────────────────────────
  classes: CourseClass[];
  attendance: AttendanceRecord[];
  gpaCourses: GPACourse[];
  assignments: Assignment[];
  studySessions: StudySession[];
  materials: CourseMaterial[];
  profile: StudentProfile | null;
  settings: AppSettingsExtended;
  isLoading: boolean;
  showAddClass: boolean;
  editingClass: CourseClass | null;
  activeSemester: Semester;
  activeAcademicYear: string;

  // ── Auth actions ───────────────────────────────────────────────────────────
  initAuth: () => () => void;
  signUp: (email: string, password: string, fullName: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  clearAuthError: () => void;

  // ── Data actions ───────────────────────────────────────────────────────────
  loadData: () => Promise<void>;
  setShowAddClass: (v: boolean) => void;
  setEditingClass: (c: CourseClass | null) => void;
  setActiveSemester: (s: Semester) => void;
  setActiveAcademicYear: (y: string) => void;
  addClass: (c: Omit<CourseClass, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateClass: (id: string, u: Partial<CourseClass>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  importClasses: (classes: Partial<CourseClass>[]) => Promise<void>;
  markAttendance: (classId: string, attended: boolean, note?: string) => Promise<void>;
  updateClassAttendanceStats: (classId: string) => Promise<void>;
  addGPACourse: (c: Omit<GPACourse, 'id'>) => Promise<void>;
  updateGPACourse: (id: string, u: Partial<GPACourse>) => Promise<void>;
  deleteGPACourse: (id: string) => Promise<void>;
  addAssignment: (a: Omit<Assignment, 'id' | 'createdAt'>) => Promise<void>;
  updateAssignment: (id: string, u: Partial<Assignment>) => Promise<void>;
  deleteAssignment: (id: string) => Promise<void>;
  toggleAssignment: (id: string) => Promise<void>;
  addStudySession: (s: Omit<StudySession, 'id'>) => Promise<void>;
  addMaterial: (m: CourseMaterial) => void;  // optimistic — material already saved to IDB
  deleteMaterial: (id: string) => Promise<void>;
  saveProfile: (p: StudentProfile) => Promise<void>;
  updateSettings: (u: Partial<AppSettingsExtended>) => Promise<void>;
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Initial state ────────────────────────────────────────────────────
      currentUser: null,
      authLoading: true,
      authError: '',
      hasProfile: false,

      classes: [], attendance: [], gpaCourses: [], assignments: [],
      studySessions: [], materials: [], profile: null,
      settings: DEFAULT_SETTINGS,
     isLoading: false,
      showAddClass: false, editingClass: null,
      activeSemester: 'First',
      activeAcademicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,

      // ── initAuth ─────────────────────────────────────────────────────────
      // The ONLY place routing state is decided.
      // currentUser + hasProfile are the two flags App.tsx uses.
      // onboardingComplete in settings is NOT used for routing anymore.
      initAuth: () => {
        return onAuthChange(async (user) => {
          if (!user) {
            // ── LOGGED OUT ──────────────────────────────────────────────────
            // Clear everything. currentUser = null is the ONLY signal
            // App.tsx needs to show the login screen.
            set({
              currentUser: null,
              authLoading: false,
              hasProfile: false,
              classes: [], attendance: [], gpaCourses: [], assignments: [],
              studySessions: [], materials: [], profile: null,
              settings: {
                ...DEFAULT_SETTINGS,
                theme: get().settings.theme, // keep theme preference
              },
            });
            return;
          }

          // ── LOGGED IN ────────────────────────────────────────────────────
          // Step 1: Mark auth as resolved, start profile check
          set({ currentUser: user, authLoading: true });

          try {
            // Step 2: Check Firestore for existing profile
            const existingProfile = await db.getProfile();
            const existingSettings = await db.getSettings();

            if (existingProfile) {
              // Returning user — load all data, go to dashboard
              await get().loadData();
              set({
                authLoading: false,
                hasProfile: true,
                settings: {
                  ...DEFAULT_SETTINGS,
                  ...(existingSettings || {}),
                  theme: get().settings.theme,
                  onboardingComplete: true,
                  firstLaunch: false,
                },
              });
            } else {
              // New user — no profile yet, show onboarding
              set({
                authLoading: false,
                hasProfile: false,
                settings: {
                  ...DEFAULT_SETTINGS,
                  theme: get().settings.theme,
                  onboardingComplete: false,
                  firstLaunch: false,
                },
              });
            }
          } catch (e) {
            console.error('initAuth profile check failed:', e);
            set({ authLoading: false, hasProfile: false });
          }
        });
      },

      // ── signUp ────────────────────────────────────────────────────────────
      signUp: async (email, password, fullName) => {
        set({ authError: '' });
        try {
          await fbSignUp(email, password, fullName);
          // onAuthChange fires automatically → sets currentUser, hasProfile=false → Onboarding
        } catch (e: any) {
          const msg = friendlyAuthError(e.code || e.message);
          set({ authError: msg });
          throw new Error(msg);
        }
      },

      // ── signIn ────────────────────────────────────────────────────────────
      signIn: async (email, password) => {
        set({ authError: '' });
        try {
          await fbSignIn(email, password);
          // onAuthChange fires automatically → sets currentUser, checks profile → Dashboard or Onboarding
        } catch (e: any) {
          const msg = friendlyAuthError(e.code || e.message);
          set({ authError: msg });
          throw new Error(msg);
        }
      },

      // ── signOut ───────────────────────────────────────────────────────────
      signOut: async () => {
        // Call Firebase signOut — onAuthChange fires → sets currentUser: null → App.tsx shows Login
        await fbSignOut();
        // onAuthChange handles all the state clearing above
      },

      // ── resetPassword ─────────────────────────────────────────────────────
      resetPassword: async (email) => {
        set({ authError: '' });
        try {
          await fbResetPassword(email);
          // No currentUser change — this just triggers Firebase to email a reset link.
        } catch (e: any) {
          const msg = friendlyAuthError(e.code || e.message);
          set({ authError: msg });
          throw new Error(msg);
        }
      },

      clearAuthError: () => set({ authError: '' }),

      // ── loadData ──────────────────────────────────────────────────────────
      loadData: async () => {
        set({ isLoading: true });
        try {
          const [classes, profile, dbSettings, gpaCourses, assignments, studySessions, materials] =
            await Promise.all([
              db.getAllClasses(), db.getProfile(), db.getSettings(),
              db.getAllGPACourses(), db.getAllAssignments(),
              db.getAllStudySessions(), db.getAllMaterials(),
            ]);
          const attendanceArrays = await Promise.all(
            classes.map(c => db.getAttendanceByClass(c.id))
          );
          set({
            classes, gpaCourses, assignments, studySessions, materials,
            attendance: attendanceArrays.flat(),
          profile: normaliseProfile(profile || undefined) || null,
            settings: {
              ...DEFAULT_SETTINGS,
              ...(dbSettings || {}),
              theme: get().settings.theme, // never lose theme
            },
            activeSemester: profile?.currentSemester || get().activeSemester,
            activeAcademicYear: profile?.currentAcademicYear || get().activeAcademicYear,
            isLoading: false,
          });
        } catch (e) {
          console.error('loadData error:', e);
          set({ isLoading: false });
        }
      },
      setShowAddClass: v => set({ showAddClass: v }),
      setEditingClass: c => set({ editingClass: c }),
      setActiveSemester: s => set({ activeSemester: s }),
      setActiveAcademicYear: y => set({ activeAcademicYear: y }),

      addClass: async classData => {
        const c: CourseClass = {
          ...classData, id: generateId(),
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        await db.saveClass(c);
        set(s => ({ classes: [...s.classes, c] }));
      },

      updateClass: async (id, updates) => {
        const existing = get().classes.find(c => c.id === id);
        if (!existing) return;
        const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
        await db.saveClass(updated);
        set(s => ({ classes: s.classes.map(c => c.id === id ? updated : c) }));
      },

      deleteClass: async id => {
        await db.deleteClass(id);
        set(s => ({
          classes: s.classes.filter(c => c.id !== id),
          attendance: s.attendance.filter(a => a.classId !== id),
        }));
      },

      importClasses: async partials => {
        const { activeSemester, activeAcademicYear, profile } = get();
        const newClasses: CourseClass[] = partials.map(cls => ({
          id: cls.id || generateId(),
          courseName: cls.courseName || 'Imported Course',
          courseCode: cls.courseCode || 'N/A',
          lecturer: cls.lecturer || 'TBD',
          day: cls.day || 'Monday',
          startTime: cls.startTime || '08:00',
          endTime: cls.endTime || '09:00',
          venue: cls.venue || 'TBD',
          department: cls.department || profile?.department || '',
          programLevel: cls.programLevel || profile?.programLevel || DEFAULT_PROGRAM_LEVEL,
          colorLabel: cls.colorLabel || 'green',
          totalClassesHeld: 0, totalClassesAttended: 0, attendancePercentage: 0,
          semester: activeSemester, academicYear: activeAcademicYear,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }));
        await Promise.all(newClasses.map(c => db.saveClass(c)));
        set(s => ({ classes: [...s.classes, ...newClasses] }));
      },

      markAttendance: async (classId, attended, note) => {
        // Only include `note` in the record if it has an actual value.
        // Firestore rejects documents that contain undefined fields, so we
        // must never spread an undefined optional into the record object.
        const record: AttendanceRecord = {
          id: generateId(), classId,
          date: new Date().toISOString().split('T')[0], attended,
          ...(note !== undefined && note !== '' ? { note } : {}),
        };
        await db.saveAttendance(record);
        // Add record to local state immediately for instant UI feedback
        set(s => ({ attendance: [...s.attendance, record] }));
        // Recalculate stats from Firestore and update classes state
        await get().updateClassAttendanceStats(classId);
      },

      updateClassAttendanceStats: async classId => {
        const all = await db.getAttendanceByClass(classId);
        const total    = all.length;
        const attended = all.filter(a => a.attended).length;
        const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
        // Save updated stats to Firestore
        const existing = get().classes.find(c => c.id === classId);
        if (!existing) return;
        const updated = {
          ...existing,
          totalClassesHeld: total,
          totalClassesAttended: attended,
          attendancePercentage: percentage,
          updatedAt: new Date().toISOString(),
        };
        await db.saveClass(updated);
        // Force update local classes state so Attendance page re-renders
        set(s => ({
          classes: s.classes.map(c => c.id === classId ? updated : c),
        }));
      },

      addGPACourse: async data => {
        const c: GPACourse = { ...data, id: generateId() };
        await db.saveGPACourse(c);
        set(s => ({ gpaCourses: [...s.gpaCourses, c] }));
      },

      updateGPACourse: async (id, updates) => {
        const existing = get().gpaCourses.find(c => c.id === id);
        if (!existing) return;
        const updated = { ...existing, ...updates };
        await db.saveGPACourse(updated);
        set(s => ({ gpaCourses: s.gpaCourses.map(c => c.id === id ? updated : c) }));
      },

      deleteGPACourse: async id => {
        await db.deleteGPACourse(id);
        set(s => ({ gpaCourses: s.gpaCourses.filter(c => c.id !== id) }));
      },

      addAssignment: async data => {
        const a: Assignment = { ...data, id: generateId(), createdAt: new Date().toISOString() };
        await db.saveAssignment(a);
        set(s => ({ assignments: [...s.assignments, a] }));
      },

      updateAssignment: async (id, updates) => {
        const existing = get().assignments.find(a => a.id === id);
        if (!existing) return;
        const updated = { ...existing, ...updates };
        await db.saveAssignment(updated);
        set(s => ({ assignments: s.assignments.map(a => a.id === id ? updated : a) }));
      },

      deleteAssignment: async id => {
        await db.deleteAssignment(id);
        set(s => ({ assignments: s.assignments.filter(a => a.id !== id) }));
      },

      toggleAssignment: async id => {
        const a = get().assignments.find(a => a.id === id);
        if (a) await get().updateAssignment(id, { completed: !a.completed });
      },

      addStudySession: async data => {
        const s: StudySession = { ...data, id: generateId() };
        await db.saveStudySession(s);
        set(st => ({ studySessions: [...st.studySessions, s] }));
      },

      // addMaterial is now a pure optimistic store update.
      // The IDB write happens in Materials.tsx (via saveMaterialToIDB) BEFORE
      // this is called, so the data is already persisted by the time it hits state.
      addMaterial: (material: CourseMaterial) => {
        set(s => ({ materials: [...s.materials, material] }));
      },

      deleteMaterial: async id => {
        // Optimistic update — remove from UI immediately, then delete from IDB
        set(s => ({ materials: s.materials.filter(m => m.id !== id) }));
        await db.deleteMaterial(id);
      },

      saveProfile: async profile => {
        await db.saveProfile(profile);
        const saved = await db.getProfile();
        const resolved = normaliseProfile(saved || profile);
        set({
          profile: resolved || null,
          hasProfile: true,
          activeSemester: profile.currentSemester,
          activeAcademicYear: profile.currentAcademicYear,
        });
      },

      updateSettings: async updates => {
        const newSettings = { ...get().settings, ...updates };
        // Update Zustand state synchronously first — immediate UI re-render
        set({ settings: newSettings });
        // Persist the FULL settings object (not just theme) so notifications
        // and other preferences survive app reopen
        try {
          const raw = localStorage.getItem(PERSIST_KEY);
          if (raw) {
            const parsed = JSON.parse(raw);
            parsed.state = parsed.state || {};
            // Store full settings so theme AND notifications are persisted
            parsed.state.settings = newSettings;
            localStorage.setItem(PERSIST_KEY, JSON.stringify(parsed));
          }
        } catch (e) { console.error('persist patch error:', e); }
        await db.saveSettings(newSettings).catch(console.error);
      },
    }),
    {
      name: PERSIST_KEY,
      // Persist full settings so theme, notifications, pin all survive reopen
      // Still exclude routing-critical flags like onboardingComplete
      partialize: s => ({
        settings: {
          theme: s.settings.theme,
          notifications: s.settings.notifications,
          pin: (s.settings as any).pin,
        },
        activeSemester: s.activeSemester,
        activeAcademicYear: s.activeAcademicYear,
      }),
    }
  )
);

function friendlyAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use':   'An account with this email already exists.',
    'auth/invalid-email':          'Please enter a valid email address.',
    'auth/weak-password':          'Password must be at least 6 characters.',
    'auth/user-not-found':         'No account found with this email.',
    'auth/wrong-password':         'Incorrect password. Try again.',
    'auth/invalid-credential':     'Incorrect email or password.',
    'auth/too-many-requests':      'Too many attempts. Please wait and try again.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/user-disabled':          'This account has been disabled.',
  };
  return map[code] || 'Something went wrong. Please try again.';
}