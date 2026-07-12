// src/services/db.ts
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, serverTimestamp, writeBatch,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import { db as firestore, auth } from './firebase';
import {
  CourseClass, AttendanceRecord, StudentProfile,
  AppSettings, GPACourse, Assignment, StudySession, CourseMaterial,
} from '../types';

// ── Environment-safe logger ───────────────────────────────────────────────────
// In development: logs full error details to the console.
// In production:  logs only a safe context label — no stack traces, no internal
//                 paths, no Firebase collection names visible to the user.
const isDev = import.meta.env.DEV;

function logError(context: string, error: unknown): void {
  if (isDev) {
    console.error(`[DB:${context}]`, error);
  } else {
    // Production: emit only the context label so DevTools reveals nothing useful
    // to an attacker who opens the browser console on a production build.
    console.error(`[DB:${context}] An error occurred.`);
  }
}

// ── User-facing error messages ────────────────────────────────────────────────
// Converts internal Firebase/network errors into safe, human-readable strings.
// Never expose raw Firebase error codes or internal paths to the UI.
export function getFriendlyError(error: unknown): string {
  if (error instanceof Error) {
    const msg = error.message.toLowerCase();
    if (msg.includes('not authenticated')) return 'Please log in to continue.';
    if (msg.includes('storage'))           return 'File upload failed. Please try again.';
    if (msg.includes('auth'))              return 'Session expired. Please log in again.';
    if (msg.includes('network') || msg.includes('offline'))
      return 'Network error. Check your connection and try again.';
    if (msg.includes('timeout'))
      return 'Upload timed out. Check your connection and try again.';
    if (msg.includes('quota'))
      return 'Storage limit reached. Please contact support.';
  }
  return 'Something went wrong. Please try again.';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}

function userCol(col: string) {
  return collection(firestore, 'users', uid(), col);
}

function userDoc(col: string, id: string) {
  return doc(firestore, 'users', uid(), col, id);
}

async function getAll<T>(col: string): Promise<T[]> {
  const snap = await getDocs(userCol(col));
  return snap.docs.map(d => d.data() as T);
}

// ── stripUndefined ────────────────────────────────────────────────────────────
// Recursively removes keys whose value is `undefined` from a plain object.
// Firestore's setDoc() throws a hard error if any field value is undefined.
// This guard ensures no optional field from anywhere in the app causes that crash.
function stripUndefined<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [k, stripUndefined(v)])
  ) as T;
}

// ── sanitiseString ────────────────────────────────────────────────────────────
// Trims and collapses internal whitespace. Applied to all string fields before
// they are written to Firestore to prevent leading/trailing whitespace and
// multi-space injection from being stored.
function sanitiseString(value: unknown): unknown {
  if (typeof value === 'string') {
    return value.trim().replace(/\s+/g, ' ');
  }
  return value;
}

// ── deepSanitise ─────────────────────────────────────────────────────────────
// Recursively applies sanitiseString to all string values in an object.
// This is the single point where all data is cleaned before hitting Firestore.
function deepSanitise<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return sanitiseString(obj) as T;
  }
  return Object.fromEntries(
    Object.entries(obj as Record<string, unknown>).map(([k, v]) => [k, deepSanitise(v)])
  ) as T;
}

// ── save ──────────────────────────────────────────────────────────────────────
// Central write function for all Firestore documents.
// Applies: undefined stripping → string sanitisation → merge write.
async function save<T>(col: string, data: T): Promise<void> {
  const id   = (data as any).id || (data as any).dataVersion?.toString() || 'singleton';
  const safe = deepSanitise(stripUndefined(data));
  await setDoc(
    userDoc(col, id),
    { ...safe, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

async function remove(col: string, id: string): Promise<void> {
  await deleteDoc(userDoc(col, id));
}

// ── Input length limits ───────────────────────────────────────────────────────
// Applied at the DB layer as a final safety net. The UI layer should also
// enforce these, but belt-and-suspenders is the correct approach.
const LIMITS = {
  courseName:   100,
  courseCode:   20,
  lecturer:     100,
  venue:        100,
  description:  1000,
  noteContent:  5000,
  linkUrl:      2000,
  materialName: 200,
  assignTitle:  200,
  fullName:     100,
  department:   100,
  matricNumber: 30,
};

function truncate(value: string | undefined, max: number): string {
  if (!value) return '';
  return value.slice(0, max);
}

// ── URL validation ────────────────────────────────────────────────────────────
// Ensures link-type material content is a safe HTTP/HTTPS URL.
// Blocks javascript:, data:, vbscript:, and other dangerous protocols.
function validateAndSanitiseUrl(url: string): string {
  const trimmed = url.trim().slice(0, LIMITS.linkUrl);
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error('Invalid URL protocol.');
    }
    return parsed.href;
  } catch {
    throw new Error('Invalid URL. Only http:// and https:// links are allowed.');
  }
}

// ── Classes ───────────────────────────────────────────────────────────────────
export async function getAllClasses(): Promise<CourseClass[]> {
  return getAll<CourseClass>('classes');
}
export async function saveClass(c: CourseClass): Promise<void> {
  // Enforce field length limits before writing
  const safe: CourseClass = {
    ...c,
    courseName: truncate(c.courseName, LIMITS.courseName),
    courseCode: truncate(c.courseCode, LIMITS.courseCode),
    lecturer:   truncate(c.lecturer,   LIMITS.lecturer),
    venue:      truncate(c.venue,      LIMITS.venue),
  };
  await save('classes', safe);
}
export async function deleteClass(id: string): Promise<void> {
  await remove('classes', id);
  const att = await getAttendanceByClass(id);
  if (att.length > 0) {
    const batch = writeBatch(firestore);
    att.forEach(r => batch.delete(userDoc('attendance', r.id)));
    await batch.commit();
  }
}

// ── Attendance ────────────────────────────────────────────────────────────────
export async function getAttendanceByClass(classId: string): Promise<AttendanceRecord[]> {
  const q    = query(userCol('attendance'), where('classId', '==', classId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as AttendanceRecord);
}
export async function saveAttendance(r: AttendanceRecord): Promise<void> {
  await save('attendance', r);
}
export async function deleteAttendance(id: string): Promise<void> {
  await remove('attendance', id);
}

// ── Profile ───────────────────────────────────────────────────────────────────
export async function getProfile(): Promise<StudentProfile | undefined> {
  const snap = await getDoc(userDoc('meta', 'profile'));
  return snap.exists() ? (snap.data() as StudentProfile) : undefined;
}

export async function saveProfile(profile: StudentProfile): Promise<void> {
  // profile.avatar must already be a Firebase Storage download URL by the
  // time it reaches here (Settings.tsx uploads via uploadProfilePicture()
  // before calling this). data:/blob: URLs are session-scoped and are
  // never persisted — they're normalised to '' so a bad caller can't leak
  // a dead URL into Firestore.
  const avatarUrl =
    profile.avatar?.startsWith('data:') || profile.avatar?.startsWith('blob:')
      ? ''
      : (profile.avatar || '');

  const profileToSave: StudentProfile = {
    ...profile,
    avatar:       avatarUrl,
    fullName:     truncate(profile.fullName,     LIMITS.fullName),
    department:   truncate(profile.department,   LIMITS.department),
    matricNumber: truncate(profile.matricNumber, LIMITS.matricNumber),
    ...(profile.cgpaScale !== undefined
      ? { cgpaScale: Number(profile.cgpaScale) as StudentProfile['cgpaScale'] }
      : {}),
  };

  await setDoc(userDoc('meta', 'profile'), stripUndefined(profileToSave), { merge: true });

  // Mirror to top-level users/{uid} doc, including photoURL — this is the
  // document other devices/tabs read via listenToProfile() for real-time sync.
  await setDoc(
    doc(firestore, 'users', uid()),
    {
      fullName:     profileToSave.fullName,
      department:   profileToSave.department,
      programLevel: profileToSave.programLevel,
      photoURL:     avatarUrl,
      ...(profileToSave.cgpaScale !== undefined ? { cgpaScale: profileToSave.cgpaScale } : {}),
      updatedAt:    serverTimestamp(),
    },
    { merge: true }
  );
}

// ── Settings ──────────────────────────────────────────────────────────────────
export async function getSettings(): Promise<AppSettings | undefined> {
  const snap = await getDoc(userDoc('meta', 'settings'));
  return snap.exists() ? (snap.data() as AppSettings) : undefined;
}
export async function saveSettings(settings: AppSettings): Promise<void> {
  await setDoc(userDoc('meta', 'settings'), stripUndefined(settings), { merge: true });
}

// ── GPA Courses ───────────────────────────────────────────────────────────────
export async function getAllGPACourses(): Promise<GPACourse[]> {
  return getAll<GPACourse>('gpaCourses');
}
export async function saveGPACourse(c: GPACourse): Promise<void> {
  const safe: GPACourse = {
    ...c,
    courseName: truncate(c.courseName, LIMITS.courseName),
    courseCode: truncate(c.courseCode, LIMITS.courseCode),
    // Clamp credit units to a realistic range (1–10)
    creditUnits: Math.max(1, Math.min(10, Math.floor(Number(c.creditUnits) || 3))),
  };
  await save('gpaCourses', safe);
}
export async function deleteGPACourse(id: string): Promise<void> {
  await remove('gpaCourses', id);
}

// ── Assignments ───────────────────────────────────────────────────────────────
export async function getAllAssignments(): Promise<Assignment[]> {
  return getAll<Assignment>('assignments');
}
export async function saveAssignment(a: Assignment): Promise<void> {
  const safe: Assignment = {
    ...a,
    title:       truncate(a.title,       LIMITS.assignTitle),
    courseCode:  truncate(a.courseCode,  LIMITS.courseCode),
    courseName:  truncate(a.courseName,  LIMITS.courseName),
    description: truncate(a.description, LIMITS.description),
  };
  await save('assignments', safe);
}
export async function deleteAssignment(id: string): Promise<void> {
  await remove('assignments', id);
}

// ── Study Sessions ────────────────────────────────────────────────────────────
export async function getAllStudySessions(): Promise<StudySession[]> {
  return getAll<StudySession>('studySessions');
}
export async function saveStudySession(s: StudySession): Promise<void> {
  await save('studySessions', s);
}

// ── Materials ─────────────────────────────────────────────────────────────────
// Metadata lives in Firestore (users/{uid}/materials/{id}); the actual file
// bytes live in Firebase Storage at users/{uid}/materials/{id}_{fileName}
// (see uploadCourseMaterial in storage.ts). This collection only stores the
// download URL + metadata, so it's the single source of truth across devices.

export async function getAllMaterials(): Promise<CourseMaterial[]> {
  return getAll<CourseMaterial>('materials');
}

export async function saveMaterial(m: CourseMaterial): Promise<void> {
  await save('materials', m);
}

export async function deleteMaterial(id: string): Promise<void> {
  await remove('materials', id);
}

// ── Real-time listeners ───────────────────────────────────────────────────────
export function listenToClasses(
  callback: (classes: CourseClass[]) => void
): Unsubscribe {
  return onSnapshot(userCol('classes'), snap => {
    callback(snap.docs.map(d => d.data() as CourseClass));
  });
}

export function listenToAssignments(
  callback: (assignments: Assignment[]) => void
): Unsubscribe {
  return onSnapshot(userCol('assignments'), snap => {
    callback(snap.docs.map(d => d.data() as Assignment));
  });
}

export function listenToProfile(
  callback: (profile: StudentProfile | undefined) => void
): Unsubscribe {
  return onSnapshot(userDoc('meta', 'profile'), snap => {
    callback(snap.exists() ? (snap.data() as StudentProfile) : undefined);
  });
}

export function listenToMaterials(
  callback: (materials: CourseMaterial[]) => void
): Unsubscribe {
  return onSnapshot(userCol('materials'), snap => {
    callback(snap.docs.map(d => d.data() as CourseMaterial));
  });
}

// ── Export / Clear ────────────────────────────────────────────────────────────
export async function exportAllData(): Promise<string> {
  const [classes, attendance, gpaCourses, assignments, studySessions, materials, profile] =
    await Promise.all([
      getAllClasses(),
      getAll<AttendanceRecord>('attendance'),
      getAllGPACourses(),
      getAllAssignments(),
      getAllStudySessions(),
      getAllMaterials(),
      getProfile(),
    ]);
  return JSON.stringify({
    exportDate: new Date().toISOString(),
    version:    3,
    classes, attendance, gpaCourses, assignments,
    studySessions, materials, profile,
  }, null, 2);
}

export async function clearAllData(): Promise<void> {
  const cols = ['classes', 'attendance', 'gpaCourses', 'assignments', 'studySessions', 'materials'];
  await Promise.all(cols.map(async col => {
    const snap = await getDocs(userCol(col));
    if (snap.docs.length === 0) return;
    const batch = writeBatch(firestore);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }));
}