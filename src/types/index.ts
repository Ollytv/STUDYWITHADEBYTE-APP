export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
export type ProgramLevel = 'ND1' | 'ND2' | 'HND1' | 'HND2' | 'Part-Time ND1' | 'Part-Time ND2' | 'Part-Time HND1' | 'Part-Time HND2';
export type ColorLabel = 'green' | 'blue' | 'purple' | 'orange' | 'red' | 'yellow' | 'pink' | 'cyan' | 'teal' | 'indigo';
export type Semester = 'First' | 'Second';
export type TabRoute = 'dashboard' | 'timetable' | 'attendance' | 'more' | 'settings' | 'gpa' | 'timer' | 'assignments' | 'materials' | 'import';

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

export interface ImportResult {
  classes: Partial<CourseClass>[];
  rawText: string;
  confidence: number;
}
