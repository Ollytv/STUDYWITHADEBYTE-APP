// src/services/timetableExtract.ts
//
// Uploads a timetable (JPG / PNG / WEBP / PDF) to the existing vision path of
// the AI gateway (/api/ai-chat) and turns the reply into structured rows.
// No provider key lives here — the gateway authenticates via Firebase ID token.

import { auth } from './firebase';
import { fileToBase64 } from './materialStorage';
import { validateAttachmentFile } from './aiChat';
import { extractJsonArray, normalizeEntries, ExtractedClass } from '../utils/timetableParse';

const ENDPOINT = '/api/ai-chat';
const REQUEST_TIMEOUT_MS = 45_000;
const RETRY_DELAYS_MS = [1_500, 3_000];
const RETRYABLE = new Set([0, 429, 500, 502, 503, 504]);

/** Images above this size are downscaled before upload (faster, cheaper, fewer timeouts). */
const COMPRESS_ABOVE_BYTES = 1_500_000;
const MAX_IMAGE_SIDE = 2000;

export class TimetableExtractError extends Error {}

const PROMPT = `You are extracting a student's class timetable from the attached file.

Return ONLY a JSON array — no explanation, no markdown, no code fences.
Each element is ONE class session with exactly these keys:
{
  "courseCode": "e.g. CSC101 (uppercase, no spaces; \\"\\" if not shown)",
  "courseName": "full course title if shown, else \\"\\"",
  "lecturer": "\\"\\" if not shown",
  "day": "Monday | Tuesday | Wednesday | Thursday | Friday | Saturday | Sunday",
  "startTime": "24-hour HH:MM, e.g. 08:00 or 14:30",
  "endTime": "24-hour HH:MM",
  "venue": "room / hall / lab, \\"\\" if not shown",
  "confidence": a number from 0 to 1 for how sure you are about this entry
}

Rules:
- If a course meets on several days, output one object per day.
- In a grid, a cell that spans several hours is ONE session: startTime is where it begins, endTime where it ends.
- Convert every time to 24-hour format. Timetables run roughly 07:00–20:00, so "2" or "2:00" means 14:00.
- Never invent data. Use "" for anything you cannot read and lower the confidence.
- Ignore headers, footers, logos, names, matric numbers and anything that is not a class.
- If the file contains no timetable, return [].`;

// ── helpers ──────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

async function prepareFile(file: File): Promise<File> {
  if (!file.type.startsWith('image/') || file.size < COMPRESS_ABOVE_BYTES) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
  } catch {
    return file; // fall back to the original — compression is only an optimisation
  }
}

function friendly(status: number, serverMessage?: string): string {
  if (status === 429) return 'The AI service is busy right now. Please wait a moment and try again.';
  if (status === 401 || status === 403) return 'Authentication error. Please refresh the page and try again.';
  if (status === 404 || status === 405) return 'The AI endpoint was not found. If you are running locally, start the app with "npm run dev:full" so /api/ai-chat is served.';
  if (status === 413) return 'This file is too large for the AI service. Try a smaller photo or a shorter PDF.';
  if (status === 400) return 'This file could not be processed. Try a clearer image or a different PDF.';
  if (status === 504 || status === 0) return 'The request timed out. Check your connection and try again.';
  if (status >= 500) return "We're having trouble reaching the AI service. Please try again in a moment.";
  if (serverMessage && serverMessage.length < 200) return serverMessage;
  return 'Something went wrong. Please try again.';
}

async function callOnce(
  attachment: { mimeType: string; dataBase64: string },
  signal?: AbortSignal,
): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw Object.assign(new TimetableExtractError('Please sign in again.'), { status: 401 });
  const idToken = await user.getIdToken();

  const timeout = new AbortController();
  const timer = setTimeout(() => timeout.abort(), REQUEST_TIMEOUT_MS);
  const combined = signal && AbortSignal.any ? AbortSignal.any([signal, timeout.signal]) : timeout.signal;

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
      body: JSON.stringify({ messages: [{ role: 'user', content: PROMPT }], attachment }),
      signal: combined,
    });
  } catch (err: any) {
    if (signal?.aborted) throw new TimetableExtractError('Cancelled.');
    const status = err?.name === 'AbortError' ? 504 : 0;
    throw Object.assign(new TimetableExtractError(friendly(status)), { status });
  } finally {
    clearTimeout(timer);
  }

  let data: { text?: string; error?: string } = {};
  try { data = await res.json(); } catch { /* handled below */ }

  if (!res.ok || data.error) {
    console.error('[timetableExtract] gateway error', { status: res.status, error: data.error });
    throw Object.assign(new TimetableExtractError(friendly(res.status, data.error)), { status: res.status });
  }
  if (!data.text || !data.text.trim()) {
    throw Object.assign(new TimetableExtractError(friendly(500)), { status: 500 });
  }
  return data.text;
}

// ── public API ───────────────────────────────────────────────────────────────

export interface TimetableExtraction {
  classes: ExtractedClass[];
  rawText: string;
  /** Mean per-row confidence, 0–1 (0 when nothing was found). */
  confidence: number;
}

export async function extractTimetable(file: File, signal?: AbortSignal): Promise<TimetableExtraction> {
  validateAttachmentFile(file); // type + size; throws AttachmentValidationError

  const prepared = await prepareFile(file);
  const dataBase64 = await fileToBase64(prepared);
  const attachment = { mimeType: prepared.type, dataBase64 };

  let rawText = '';
  for (let attempt = 0; ; attempt++) {
    try {
      rawText = await callOnce(attachment, signal);
      break;
    } catch (err: any) {
      const status: number = err?.status ?? 0;
      if (signal?.aborted || !RETRYABLE.has(status) || attempt >= RETRY_DELAYS_MS.length) throw err;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  const arr = extractJsonArray(rawText);
  if (!arr) {
    throw new TimetableExtractError(
      "We couldn't read a timetable from that file. Try a clearer, straight-on photo or the original PDF.",
    );
  }

  const classes = normalizeEntries(arr);
  const confidence = classes.length
    ? classes.reduce((sum, c) => sum + c.confidence, 0) / classes.length
    : 0;
  return { classes, rawText, confidence };
}
