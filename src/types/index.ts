export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

// ─────────────────────────────────────────────────────────────────────────────
// ACADEMIC LEVEL SYSTEM
// Global, institution-agnostic structure that supports both local and
// international schools. Add new values here to extend — no other file breaks.
// ─────────────────────────────────────────────────────────────────────────────

/** Primary year-based levels (used by most degree/diploma programmes) */
export type PrimaryLevel =
  | 'Foundation'   // Pre-degree / foundation year
  | 'Year 1'       // Level 100
  | 'Year 2'       // Level 200
  | 'Year 3'       // Level 300
  | 'Year 4';      // Level 400 — optional extended programme

/** Short certificate/diploma levels (sub-degree, vocational, professional) */
export type ProgrammeLevel =
  | 'Certificate'
  | 'Diploma'
  | 'Advanced Diploma';

/**
 * Combined union used wherever a student's academic level is stored.
 * Keeping PrimaryLevel and ProgrammeLevel separate lets you filter
 * by category (e.g. show only year-based levels in a timetable filter)
 * without a breaking change.
 */
export type ProgramLevel = PrimaryLevel | ProgrammeLevel;

/**
 * Metadata for every level — used to build dropdowns, labels, and
 * filter chips without scattering magic strings across the codebase.
 * Add a new entry here to introduce a new level everywhere at once.
 */
export interface ProgramLevelMeta {
  value: ProgramLevel;
  label: string;         // User-facing display name
  shortLabel: string;    // Compact label for chips / badges
  category: 'primary' | 'programme';
  levelCode?: string;    // e.g. "100", "200" — undefined for non-year levels
}

export const PROGRAM_LEVEL_META: ProgramLevelMeta[] = [
  // ── Primary levels ────────────────────────────────────────────────────
  { value: 'Foundation',     label: 'Foundation / Pre-degree', shortLabel: 'Foundation', category: 'primary' },
  { value: 'Year 1',         label: 'Year 1 (Level 100)',       shortLabel: 'Year 1',     category: 'primary', levelCode: '100' },
  { value: 'Year 2',         label: 'Year 2 (Level 200)',       shortLabel: 'Year 2',     category: 'primary', levelCode: '200' },
  { value: 'Year 3',         label: 'Year 3 (Level 300)',       shortLabel: 'Year 3',     category: 'primary', levelCode: '300' },
  { value: 'Year 4',         label: 'Year 4 (Level 400)',       shortLabel: 'Year 4',     category: 'primary', levelCode: '400' },
  // ── Programme levels ──────────────────────────────────────────────────
  { value: 'Certificate',    label: 'Certificate Level',        shortLabel: 'Cert',       category: 'programme' },
  { value: 'Diploma',        label: 'Diploma Level',            shortLabel: 'Diploma',    category: 'programme' },
  { value: 'Advanced Diploma', label: 'Advanced Diploma Level', shortLabel: 'Adv. Dip',  category: 'programme' },
];

/** All valid ProgramLevel values as a plain array — useful for runtime validation. */
export const ALL_PROGRAM_LEVELS: ProgramLevel[] = PROGRAM_LEVEL_META.map(m => m.value);

/** Default level assigned to new profiles. */
export const DEFAULT_PROGRAM_LEVEL: ProgramLevel = 'Year 1';

// ─────────────────────────────────────────────────────────────────────────────
// CGPA SCALE SYSTEM
// Supports multiple school grading scales. Add a new value here to extend.
// ─────────────────────────────────────────────────────────────────────────────

/** The maximum GPA value used by the student's school. */
export type CgpaScale = 3.0 | 4.0 | 5.0;

export interface CgpaScaleOption {
  value: CgpaScale;
  label: string;   // e.g. "5.0 Scale"
  display: string; // e.g. "/ 5.0"
}

export const CGPA_SCALE_OPTIONS: CgpaScaleOption[] = [
  { value: 3.0, label: '3.0 Scale', display: '/ 3.0' },
  { value: 4.0, label: '4.0 Scale', display: '/ 4.0' },
  { value: 5.0, label: '5.0 Scale', display: '/ 5.0' },
];

/**
 * Default scale for existing users who pre-date this feature.
 * 5.0 preserves the previous hardcoded behaviour — no data loss.
 */
export const DEFAULT_CGPA_SCALE: CgpaScale = 5.0;

/** Look up display metadata for any level value. */
export function getProgramLevelMeta(value: ProgramLevel): ProgramLevelMeta {
  return PROGRAM_LEVEL_META.find(m => m.value === value) ?? PROGRAM_LEVEL_META[1];
}

// ─────────────────────────────────────────────────────────────────────────────

export type ColorLabel = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'yellow' | 'pink' | 'cyan' | 'teal' | 'indigo';
export type Semester = 'First' | 'Second';
export type TabRoute = 'dashboard' | 'timetable' | 'attendance' | 'more' | 'settings' | 'gpa' | 'timer' | 'assignments' | 'materials' | 'import' | 'ai';

export interface CourseClass {
  id: string;
  courseName: string;
  courseCode: string;
  lecturer: string;
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  venue: string;
  department: string;
  programLevel: ProgramLevel;
  colorLabel: ColorLabel;
  totalClassesHeld: number;
  totalClassesAttended: number;
  attendancePercentage: number;
  notes?: string;
  semester: Semester;
  academicYear: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceRecord {
  id: string;
  classId: string;
  date: string;
  attended: boolean;
  note?: string;
}

export interface GPACourse {
  id: string;
  courseName: string;
  courseCode: string;
  creditUnits: number;
  score?: number;  // undefined on legacy records saved before score-first system
  grade: string;
  gradePoint: number;
  semester: Semester;
  academicYear: string;
}

export interface Assignment {
  id: string;
  title: string;
  courseCode: string;
  courseName: string;
  deadline: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  description?: string;
  semester: Semester;
  academicYear: string;
  createdAt: string;
}

export interface StudySession {
  id: string;
  date: string;
  duration: number; // minutes
  type: 'study' | 'break';
  courseCode?: string;
}

export interface CourseMaterial {
  id: string;
  name: string;
  courseCode: string;
  courseName: string;
  type: 'pdf' | 'image' | 'note' | 'link';
  content: string; // base64 or URL or text
  size?: number;
  semester: Semester;
  academicYear: string;
  createdAt: string;
}

export interface StudentProfile {
  fullName: string;
  department: string;
  programLevel: ProgramLevel;
  /** School CGPA scale. Optional so existing Firestore docs without it still load. */
  cgpaScale?: CgpaScale;
  matricNumber?: string;
  email?: string;
  avatar?: string;
  semesterStartDate: string;
  semesterEndDate: string;
  targetAttendance: number;
  currentSemester: Semester;
  currentAcademicYear: string;
}

export interface NotificationSettings {
  enabled: boolean;
  tenMinsBefore: boolean;
  thirtyMinsBefore: boolean;
  oneHourBefore: boolean;
  sound: boolean;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  notifications: NotificationSettings;
  firstLaunch: boolean;
  onboardingComplete: boolean;
  dataVersion: number;
}

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
  /** true while the assistant is still streaming the response */
  streaming?: boolean;
  /** set if this message failed to send */
  error?: boolean;
}

export interface ChatConversation {
  id: string;
  title: string;       // first user message truncated to 60 chars
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  classes: Partial<CourseClass>[];
  rawText: string;
  confidence: number;
}