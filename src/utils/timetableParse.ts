// src/utils/timetableParse.ts
//
// Pure helpers (no Firebase / React imports) for turning the vision model's
// reply into clean timetable rows, plus validation and conflict detection.

import type { ColorLabel, DayOfWeek } from '../types';

export interface ExtractedClass {
  /** Stable key for React lists / edits. */
  key: string;
  courseCode: string;
  courseName: string;
  lecturer: string;
  /** '' when the model could not read the day. */
  day: DayOfWeek | '';
  /** 24h "HH:MM", or '' when unreadable. */
  startTime: string;
  endTime: string;
  venue: string;
  /** 0–1, model-reported (default 0.7 when missing). */
  confidence: number;
}

// ── JSON extraction ──────────────────────────────────────────────────────────

const MATERIAL_DELIMITER = '---MATERIAL CONTEXT---';

function toArray(v: unknown): unknown[] | null {
  if (Array.isArray(v)) return v;
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    for (const k of ['classes', 'timetable', 'entries', 'courses', 'schedule', 'sessions']) {
      if (Array.isArray(o[k])) return o[k] as unknown[];
    }
  }
  return null;
}

/** Finds the first balanced [...] or {...} block in `text` and parses it. */
function parseFirstBlock(text: string): unknown[] | null {
  const stripped = text.replace(/```(?:json)?/gi, '').trim();
  const starts = [stripped.indexOf('['), stripped.indexOf('{')].filter(i => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const open = stripped[start];
  const close = open === '[' ? ']' : '}';

  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < stripped.length; i++) {
    const ch = stripped[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') { inStr = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) {
        try { return toArray(JSON.parse(stripped.slice(start, i + 1))); }
        catch { return null; }
      }
    }
  }
  return null;
}

/** Truncated-reply rescue: pull out every flat {...} object that parses. */
function salvageObjects(text: string): unknown[] | null {
  const found: unknown[] = [];
  for (const m of text.matchAll(/\{[^{}]*\}/g)) {
    try {
      const o = JSON.parse(m[0]);
      if (o && typeof o === 'object' && ('day' in o || 'courseCode' in o || 'code' in o)) found.push(o);
    } catch { /* skip */ }
  }
  return found.length > 0 ? found : null;
}

export function extractJsonArray(text: string): unknown[] | null {
  const candidates = [text];
  const i = text.indexOf(MATERIAL_DELIMITER);
  if (i >= 0) candidates.unshift(text.slice(0, i), text.slice(i + MATERIAL_DELIMITER.length));
  for (const c of candidates) {
    const arr = parseFirstBlock(c);
    if (arr) return arr;
  }
  for (const c of candidates) {
    const arr = salvageObjects(c);
    if (arr) return arr;
  }
  return null;
}

// ── Field normalisers ────────────────────────────────────────────────────────

const DAY_ALIASES: Record<string, DayOfWeek> = {
  mon: 'Monday', monday: 'Monday',
  tue: 'Tuesday', tues: 'Tuesday', tuesday: 'Tuesday',
  wed: 'Wednesday', weds: 'Wednesday', wednesday: 'Wednesday',
  thu: 'Thursday', thur: 'Thursday', thurs: 'Thursday', thursday: 'Thursday',
  fri: 'Friday', friday: 'Friday',
  sat: 'Saturday', saturday: 'Saturday',
  sun: 'Sunday', sunday: 'Sunday',
};

export function normalizeDay(v: unknown): DayOfWeek | '' {
  const s = String(v ?? '').trim().toLowerCase().replace(/[^a-z]/g, '');
  return DAY_ALIASES[s] ?? '';
}

/**
 * "8", "8:30", "08.30", "0830", "8am", "1:30 PM" → "HH:MM".
 * With no am/pm, hours 1–6 are read as afternoon (classes don't start at 3am).
 */
export function normalizeTime(v: unknown): string {
  const s = String(v ?? '').trim().toLowerCase();
  if (!s) return '';
  const m = s.match(/^(\d{1,2})(?:[:.h]?(\d{2}))?\s*(a\.?m?\.?|p\.?m?\.?)?$/);
  if (!m) return '';
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const mer = m[3] ? m[3][0] : '';
  if (min > 59 || h > 23) return '';
  if (mer === 'p' && h < 12) h += 12;
  else if (mer === 'a' && h === 12) h = 0;
  else if (!mer && h >= 1 && h <= 6) h += 12;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function normalizeCode(v: unknown): string {
  const s = String(v ?? '').trim().toUpperCase().replace(/\s+/g, ' ');
  // "CSC 101" → "CSC101"
  const m = s.match(/^([A-Z]{2,5})\s?(\d{2,4}[A-Z]?)$/);
  return m ? `${m[1]}${m[2]}` : s;
}

function str(o: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
    if (typeof v === 'number') return String(v);
  }
  return '';
}

function timeRange(raw: string): [string, string] {
  const parts = raw.split(/\s*(?:-|–|—|to)\s*/i);
  return parts.length === 2 ? [parts[0], parts[1]] : ['', ''];
}

// ── Raw model output → rows ──────────────────────────────────────────────────

export function normalizeEntries(raw: unknown[]): ExtractedClass[] {
  const seen = new Set<string>();
  const out: ExtractedClass[] = [];

  raw.forEach(item => {
    if (!item || typeof item !== 'object') return;
    const o = item as Record<string, unknown>;

    let start = str(o, 'startTime', 'start', 'from');
    let end = str(o, 'endTime', 'end', 'to');
    if (!start && !end) [start, end] = timeRange(str(o, 'time', 'times'));

    const courseCode = normalizeCode(str(o, 'courseCode', 'code', 'course_code'));
    const courseName = str(o, 'courseName', 'name', 'title', 'course');
    const day = normalizeDay(str(o, 'day', 'weekday'));
    if (!courseCode && !courseName) return;

    const conf = typeof o.confidence === 'number' ? Math.min(1, Math.max(0, o.confidence)) : 0.7;
    const row: ExtractedClass = {
      key: '',
      courseCode,
      courseName,
      lecturer: str(o, 'lecturer', 'instructor', 'teacher'),
      day,
      startTime: normalizeTime(start),
      endTime: normalizeTime(end),
      venue: str(o, 'venue', 'room', 'location', 'hall'),
      confidence: conf,
    };

    const dedupeKey = `${row.courseCode}|${row.day}|${row.startTime}|${row.endTime}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    row.key = `r${out.length}-${Math.random().toString(36).slice(2, 7)}`;
    out.push(row);
  });

  return out;
}

// ── Colours ──────────────────────────────────────────────────────────────────

const PALETTE: ColorLabel[] = ['green', 'blue', 'purple', 'orange', 'pink', 'cyan', 'yellow', 'teal', 'indigo', 'red'];

/** Same course code → same colour; different codes cycle through the palette. */
export function assignColors(rows: { courseCode: string; courseName: string }[]): ColorLabel[] {
  const map = new Map<string, ColorLabel>();
  return rows.map(r => {
    const id = r.courseCode || r.courseName;
    if (!map.has(id)) map.set(id, PALETTE[map.size % PALETTE.length]);
    return map.get(id)!;
  });
}

// ── Validation & conflicts ───────────────────────────────────────────────────

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function toMin(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/** Blocking problems — a row with any of these can't be saved. */
export function validateRow(r: ExtractedClass): string[] {
  const errs: string[] = [];
  if (!r.courseCode.trim() && !r.courseName.trim()) errs.push('Needs a course code or name');
  if (!r.day) errs.push('Pick a day');
  if (!TIME_RE.test(r.startTime)) errs.push('Start time missing');
  if (!TIME_RE.test(r.endTime)) errs.push('End time missing');
  if (TIME_RE.test(r.startTime) && TIME_RE.test(r.endTime) && toMin(r.endTime) <= toMin(r.startTime)) {
    errs.push('End must be after start');
  }
  return errs;
}

export interface ConflictInfo {
  /** Course labels this row's time overlaps with (other rows or existing classes). */
  overlaps: string[];
  /** Same code + day + start time already exists in the timetable. */
  duplicateOfExisting: boolean;
}

interface SlotLike { courseCode: string; day: string; startTime: string; endTime: string }

export function findConflicts(
  rows: ExtractedClass[],
  existing: SlotLike[],
): Record<string, ConflictInfo> {
  const result: Record<string, ConflictInfo> = {};
  const usable = (s: SlotLike) => TIME_RE.test(s.startTime) && TIME_RE.test(s.endTime) && !!s.day;
  const overlap = (a: SlotLike, b: SlotLike) =>
    a.day === b.day && toMin(a.startTime) < toMin(b.endTime) && toMin(b.startTime) < toMin(a.endTime);

  for (const r of rows) {
    const info: ConflictInfo = { overlaps: [], duplicateOfExisting: false };
    if (usable(r)) {
      const code = r.courseCode.toUpperCase();
      for (const e of existing) {
        if (!usable(e)) continue;
        if (e.courseCode.toUpperCase() === code && e.day === r.day && e.startTime === r.startTime) {
          info.duplicateOfExisting = true;
        } else if (overlap(r, e)) {
          info.overlaps.push(e.courseCode || 'existing class');
        }
      }
      for (const o of rows) {
        if (o.key === r.key || !usable(o)) continue;
        if (overlap(r, o)) info.overlaps.push(o.courseCode || o.courseName || 'another row');
      }
    }
    info.overlaps = [...new Set(info.overlaps)];
    result[r.key] = info;
  }
  return result;
}
