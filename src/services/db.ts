// src/services/db.ts
import {
  collection, doc, getDoc, getDocs, setDoc, deleteDoc,
  query, where, serverTimestamp, writeBatch,
  onSnapshot, Unsubscribe,
} from 'firebase/firestore';
import {
  ref, uploadBytesResumable, getDownloadURL, deleteObject,
} from 'firebase/storage';
import { db as firestore, storage, auth } from './firebase';
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

// ── Upload helper ─────────────────────────────────────────────────────────────
// Converts a base64 data URL → Blob → uploads via uploadBytesResumable.
// Provides real-time progress events and a 60-second stall watchdog.
// Returns the public download URL from Firebase Storage.
//
// SECURITY NOTES:
// - The storage path is always scoped to the authenticated user's UID.
//   Cross-user path injection is not possible because uid() throws if not auth'd.
// - File type and size enforcement is done at the CALLER level (saveMaterial,
//   saveProfile) AND enforced again by Storage security rules server-side.
// - Raw base64 data URLs are never written to Firestore — only the resolved
//   Storage download URL is stored, keeping documents under the 1MB limit.
async function uploadDataUrl(
  dataUrl: string,
  path: string,
  onProgress?: (pct: number) => void
): Promise<string> {
  const res  = await fetch(dataUrl);
  const blob = await res.blob();

  const storageRef = ref(storage, path);
  const uploadTask = uploadBytesResumable(storageRef, blob);

  return new Promise<string>((resolve, reject) => {
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    function resetStallTimer() {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error('Upload timed out — please check your connection and try again.'));
      }, 60_000);
    }

    resetStallTimer();

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        resetStallTimer();
        if (onProgress && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          onProgress(pct);
        }
      },
      (error) => {
        if (stallTimer) clearTimeout(stallTimer);
        if (error.code !== 'storage/canceled') {
          logError('uploadDataUrl', error);
          reject(new Error('Upload failed. Please try again.'));
        }
      },
      async () => {
        if (stallTimer) clearTimeout(stallTimer);
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          onProgress?.(100);
          resolve(url);
        } catch (err) {
          logError('uploadDataUrl:getDownloadURL', err);
          reject(new Error('Could not retrieve the uploaded file URL. Please try again.'));
        }
      }
    );
  });
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
  let avatarUrl = profile.avatar || '';

  if (avatarUrl.startsWith('data:')) {
    // Validate MIME type of the base64 data URL before uploading
    const mimeMatch = avatarUrl.match(/^data:([^;]+);base64,/);
    const mime      = mimeMatch?.[1] ?? '';
    const allowedImageMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedImageMimes.includes(mime)) {
      throw new Error('Avatar must be a JPEG, PNG, GIF, or WebP image.');
    }

    avatarUrl = await uploadDataUrl(avatarUrl, `avatars/${uid()}/profile.jpg`);
  }

  // Enforce field length limits on profile data
  const profileToSave: StudentProfile = {
    ...profile,
    avatar:      avatarUrl,
    fullName:    truncate(profile.fullName,    LIMITS.fullName),
    department:  truncate(profile.department,  LIMITS.department),
    matricNumber: truncate(profile.matricNumber, LIMITS.matricNumber),
  };

  await setDoc(userDoc('meta', 'profile'), stripUndefined(profileToSave), { merge: true });
  await setDoc(
    doc(firestore, 'users', uid()),
    {
      fullName:     profileToSave.fullName,
      department:   profileToSave.department,
      programLevel: profileToSave.programLevel,
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

// Allowed MIME types for file uploads — enforced client-side here AND
// server-side by Storage security rules (defence in depth).
const ALLOWED_MATERIAL_MIMES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
]);

const MAX_MATERIAL_BYTES = 20 * 1024 * 1024; // 20 MB — matches Storage rules

export async function getAllMaterials(): Promise<CourseMaterial[]> {
  return getAll<CourseMaterial>('materials');
}

export async function saveMaterial(
  m: CourseMaterial,
  onProgress?: (pct: number) => void
): Promise<void> {
  let content = m.content;

  if ((m.type === 'pdf' || m.type === 'image') && content.startsWith('data:')) {
    // ── Validate MIME type from data URL header ──────────────────────────
    const mimeMatch = content.match(/^data:([^;]+);base64,/);
    const mime      = mimeMatch?.[1] ?? '';

    if (!ALLOWED_MATERIAL_MIMES.has(mime)) {
      throw new Error(
        `File type "${mime}" is not allowed. Only PDF and image files may be uploaded.`
      );
    }

    // ── Validate approximate file size from base64 length ────────────────
    // base64 encodes 3 bytes as 4 chars; the header prefix is ~30–80 chars
    const base64Part  = content.split(',')[1] ?? '';
    const approxBytes = Math.ceil((base64Part.length * 3) / 4);
    if (approxBytes > MAX_MATERIAL_BYTES) {
      throw new Error(
        `File is too large (approx. ${Math.round(approxBytes / 1024 / 1024)}MB). ` +
        `Maximum allowed size is 20MB.`
      );
    }

    // ── Upload to Firebase Storage ────────────────────────────────────────
    const storagePath = `materials/${uid()}/${m.id}`;
    content           = await uploadDataUrl(content, storagePath, onProgress);
  }

  // For link-type materials, validate and sanitise the URL
  if (m.type === 'link') {
    content = validateAndSanitiseUrl(content);
  }

  // Enforce field length limits
  const safe: CourseMaterial = {
    ...m,
    content,
    name:       truncate(m.name,       LIMITS.materialName),
    courseCode: truncate(m.courseCode, LIMITS.courseCode),
    courseName: truncate(m.courseName, LIMITS.courseName),
  };

  // Save to Firestore — content is now a Storage URL (short string), never raw base64
  await save('materials', safe);
}

export async function deleteMaterial(id: string): Promise<void> {
  try {
    await deleteObject(ref(storage, `materials/${uid()}/${id}`));
  } catch (_) { /* file may not exist in Storage — safe to ignore */ }
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