import { CourseClass, DayOfWeek, ColorLabel, ImportResult, ProgramLevel, DEFAULT_PROGRAM_LEVEL } from '../types';
import { generateId } from '../utils/id';

// Days of week for detection
const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const DAY_ALIASES: Record<string, DayOfWeek> = {
  'mon': 'Monday', 'tue': 'Tuesday', 'tues': 'Tuesday',
  'wed': 'Wednesday', 'thu': 'Thursday', 'thur': 'Thursday', 'thurs': 'Thursday',
  'fri': 'Friday', 'sat': 'Saturday', 'sun': 'Sunday',
};

const COLORS: ColorLabel[] = ['green', 'blue', 'purple', 'orange', 'red', 'yellow', 'pink', 'cyan', 'teal', 'indigo'];

function assignColor(index: number): ColorLabel {
  return COLORS[index % COLORS.length];
}

// Parse time strings like "8:00AM", "08:00", "8am", "800"
function parseTime(str: string): string | null {
  str = str.trim().toLowerCase();

  // HH:MM AM/PM
  const match1 = str.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (match1) {
    let hours = parseInt(match1[1]);
    const mins = match1[2];
    const ampm = match1[3];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${mins}`;
  }

  // HHMM
  const match2 = str.match(/^(\d{3,4})$/);
  if (match2) {
    const t = match2[1].padStart(4, '0');
    return `${t.slice(0, 2)}:${t.slice(2)}`;
  }

  // Xam/pm
  const match3 = str.match(/^(\d{1,2})(am|pm)$/);
  if (match3) {
    let hours = parseInt(match3[1]);
    const ampm = match3[2];
    if (ampm === 'pm' && hours < 12) hours += 12;
    if (ampm === 'am' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:00`;
  }

  return null;
}

// Detect day from line
function detectDay(line: string): DayOfWeek | null {
  const lower = line.toLowerCase();
  for (const day of DAYS) {
    if (lower.includes(day.toLowerCase())) return day;
  }
  for (const [alias, day] of Object.entries(DAY_ALIASES)) {
    const regex = new RegExp(`\\b${alias}\\b`, 'i');
    if (regex.test(line)) return day;
  }
  return null;
}

// Extract time range from line
function extractTimeRange(line: string): { start: string; end: string } | null {
  // Patterns: "8:00-10:00", "8AM-10AM", "8:00AM - 10:00AM", "0800-1000"
  const patterns = [
    /(\d{1,2}:\d{2}\s*(?:am|pm)?)\s*[-–—to]+\s*(\d{1,2}:\d{2}\s*(?:am|pm)?)/i,
    /(\d{1,2}\s*(?:am|pm))\s*[-–—to]+\s*(\d{1,2}\s*(?:am|pm))/i,
    /(\d{3,4})\s*[-–—to]+\s*(\d{3,4})/,
  ];

  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (match) {
      const start = parseTime(match[1]);
      const end = parseTime(match[2]);
      if (start && end) return { start, end };
    }
  }

  return null;
}

// Extract course code (e.g., CSC101, MEC202, EEE301)
function extractCourseCode(line: string): string | null {
  const match = line.match(/\b([A-Z]{2,4}\s*\d{3,4}[A-Z]?)\b/);
  return match ? match[1].replace(/\s+/g, '') : null;
}

// Parse raw timetable text into structured classes
export function parseTimetableText(text: string, department = '', programLevel: ProgramLevel = DEFAULT_PROGRAM_LEVEL): Partial<CourseClass>[] {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 2);
  const classes: Partial<CourseClass>[] = [];

  let currentDay: DayOfWeek | null = null;
  let colorIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line is a day header
    const detectedDay = detectDay(line);
    if (detectedDay && line.length < 30) {
      currentDay = detectedDay;
      continue;
    }

    const timeRange = extractTimeRange(line);
    if (!timeRange) continue;

    // This line likely contains a class - extract data
    const courseCode = extractCourseCode(line) || extractCourseCode(lines[i + 1] || '');
    const day = currentDay || detectDay(line) || 'Monday';

    // Try to find venue (typically single word or "Lab", "Hall", "Room X")
    const venueMatch = line.match(/\b(hall|lab|room|lec|lecture|theatre|class)\s*\w*/i);
    const venue = venueMatch ? venueMatch[0] : 'TBD';

    // Extract course name: everything that isn't time/code/venue
    let courseName = line
      .replace(/\d{1,2}:\d{2}\s*(?:am|pm)?/gi, '')
      .replace(/\d{3,4}/g, '')
      .replace(/am|pm/gi, '')
      .replace(/[-–—]/g, '')
      .replace(venueMatch?.[0] || '', '')
      .replace(courseCode || '', '')
      .trim();

    if (courseName.length < 3 && lines[i + 1]) {
      courseName = lines[i + 1].replace(extractCourseCode(lines[i + 1]) || '', '').trim();
    }
    if (!courseName || courseName.length < 3) {
      courseName = courseCode ? `${courseCode} Course` : 'Course';
    }

    classes.push({
      id: generateId(),
      courseName: courseName.substring(0, 60),
      courseCode: courseCode || 'N/A',
      day,
      startTime: timeRange.start,
      endTime: timeRange.end,
      venue: venue.substring(0, 40),
      lecturer: 'TBD',
      department,
      programLevel,
      colorLabel: assignColor(colorIndex++),
      totalClassesHeld: 0,
      totalClassesAttended: 0,
      attendancePercentage: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  return classes;
}

// Import from PDF
export async function importFromPDF(file: File): Promise<ImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();

    // Dynamic import to avoid build issues
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    const classes = parseTimetableText(fullText);
    return { classes, rawText: fullText, confidence: classes.length > 0 ? 0.8 : 0.3 };
  } catch (error) {
    console.error('PDF import error:', error);
    return { classes: [], rawText: '', confidence: 0 };
  }
}

// Import from DOCX
export async function importFromDOCX(file: File): Promise<ImportResult> {
  try {
    const mammoth = await import('mammoth');
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    const fullText = result.value;

    const classes = parseTimetableText(fullText);
    return { classes, rawText: fullText, confidence: classes.length > 0 ? 0.85 : 0.3 };
  } catch (error) {
    console.error('DOCX import error:', error);
    return { classes: [], rawText: '', confidence: 0 };
  }
}

// Import from Image using OCR
export async function importFromImage(file: File): Promise<ImportResult> {
  try {
    const Tesseract = await import('tesseract.js');
    const imageUrl = URL.createObjectURL(file);

    const result = await Tesseract.recognize(imageUrl, 'eng', {
      logger: () => {},
    });

    URL.revokeObjectURL(imageUrl);
    const fullText = result.data.text;
    const classes = parseTimetableText(fullText);

    return {
      classes,
      rawText: fullText,
      confidence: (result.data.confidence / 100) * (classes.length > 0 ? 0.8 : 0.3),
    };
  } catch (error) {
    console.error('Image OCR error:', error);
    return { classes: [], rawText: '', confidence: 0 };
  }
}

// Main import function that handles all file types
export async function importTimetableFile(file: File): Promise<ImportResult> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') return importFromPDF(file);
  if (ext === 'docx' || ext === 'doc') return importFromDOCX(file);
  if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(ext || '')) {
    return importFromImage(file);
  }

  // Plain text fallback
  const text = await file.text();
  const classes = parseTimetableText(text);
  return { classes, rawText: text, confidence: 0.9 };
}