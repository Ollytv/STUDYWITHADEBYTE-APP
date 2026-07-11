// src/services/aiChat.ts
//
// Client-side service for StudiByte AI Assistant.
// All Gemini API calls go through the Netlify serverless function —
// the API key is never present in this file or any frontend code.

import {
  collection, doc, getDocs, setDoc,
  deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatConversation, ChatMessage } from '../types';
import { generateId } from '../utils/id';

// ── Constants ─────────────────────────────────────────────────────────────────

const GEMINI_ENDPOINT = '/.netlify/functions/gemini';

/** Hard timeout per attempt (ms). Netlify kills functions at 10 s; stay under. */
const REQUEST_TIMEOUT_MS = 9_000;

/** HTTP status codes that warrant an automatic retry. */
const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

/** Exponential backoff delays (ms) for retry attempts 1, 2, 3. */
const RETRY_DELAYS_MS = [2_000, 4_000, 8_000];

const MAX_RETRIES = RETRY_DELAYS_MS.length;

// ── Types ─────────────────────────────────────────────────────────────────────

interface GeminiMessage {
  role:  'user' | 'model';
  parts: { text: string }[];
}

/** Internal error carrying the HTTP status so the retry logic can inspect it. */
class GeminiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryable: boolean,
  ) {
    super(message);
    this.name = 'GeminiRequestError';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}

function convCollection() {
  return collection(db, 'users', uid(), 'conversations');
}

function makeTitle(text: string): string {
  return text.trim().slice(0, 60) + (text.trim().length > 60 ? '…' : '');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Map an HTTP status code to a user-friendly message.
 * Never exposes raw status codes to the user.
 */
function friendlyError(status: number, serverMessage?: string): string {
  if (status === 429) {
    return 'The AI service is temporarily busy. Please wait a moment and try again.';
  }
  if (status === 401 || status === 403) {
    return 'Authentication error. Please refresh the page and try again.';
  }
  if (status === 400) {
    return 'Your message could not be processed. Please try rephrasing it.';
  }
  if (status === 502 || status === 503 || status === 504) {
    return "We're having trouble reaching the AI service. Please try again in a moment.";
  }
  if (status === 500) {
    return 'The AI service encountered an unexpected error. Please try again.';
  }
  // Fall back to the server's own message only if it's safe and present
  if (serverMessage && serverMessage.length < 200) return serverMessage;
  return 'Something went wrong. Please try again.';
}

// ── Single attempt ────────────────────────────────────────────────────────────

/**
 * Execute one fetch attempt with a timeout via AbortController.
 * Throws GeminiRequestError on any failure so the retry wrapper can decide
 * whether to retry or surface the error.
 */
async function attemptGeminiCall(
  geminiMessages: GeminiMessage[],
  signal: AbortSignal,
): Promise<string> {
  // Per-attempt timeout — independent of the outer abort signal
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(
    () => timeoutController.abort(),
    REQUEST_TIMEOUT_MS,
  );

  // Combine caller's abort signal with the timeout signal
  const combinedSignal = AbortSignal.any
    ? AbortSignal.any([signal, timeoutController.signal])
    : timeoutController.signal; // graceful fallback for older environments

  let response: Response;
  try {
    response = await fetch(GEMINI_ENDPOINT, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: geminiMessages }),
      signal:  combinedSignal,
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    // AbortError from timeout → treat as 504 (gateway timeout)
    if (err?.name === 'AbortError') {
      throw new GeminiRequestError(
        'Request timed out. The AI service took too long to respond.',
        504,
        true,
      );
    }
    // Network-level failure (no connection, DNS, etc.)
    throw new GeminiRequestError(
      "We're having trouble reaching the AI service. Check your connection and try again.",
      0,
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }

  // Parse JSON regardless of status so we can read the error body
  let data: { text?: string; error?: string };
  try {
    data = await response.json();
  } catch {
    throw new GeminiRequestError(
      friendlyError(response.status),
      response.status,
      RETRYABLE_STATUSES.has(response.status),
    );
  }

  if (!response.ok || data.error) {
    const status    = response.status;
    const retryable = RETRYABLE_STATUSES.has(status);
    throw new GeminiRequestError(
      friendlyError(status, data.error),
      status,
      retryable,
    );
  }

  if (!data.text || typeof data.text !== 'string' || data.text.trim() === '') {
    // Empty-body 200 — treat as transient server fault
    throw new GeminiRequestError(
      'The AI returned an empty response. Please try again.',
      500,
      true,
    );
  }

  return data.text;
}

// ── Gemini proxy call (public API) ────────────────────────────────────────────

/**
 * Send the full conversation history to the Netlify function and get
 * the assistant's reply text back.
 *
 * Features:
 * - Validates the prompt before sending
 * - Per-attempt AbortController timeout (9 s)
 * - Automatic retries with exponential backoff for transient errors
 *   (429, 500, 502, 503, 504) — up to 3 retries
 * - Does NOT retry 400, 401, 403 (non-transient)
 * - Accepts an external AbortSignal so the caller can cancel mid-flight
 * - If any retry succeeds, no error is surfaced to the caller
 * - Logs full error objects in development for diagnostics
 *
 * @throws Error with user-readable message on final failure
 */
export async function callGemini(
  messages: ChatMessage[],
  externalSignal?: AbortSignal,
): Promise<string> {
  // ── 1. Validate ────────────────────────────────────────────────────────────
  const validMessages = messages.filter(m => !m.error && !m.streaming);

  if (validMessages.length === 0) {
    throw new Error('No valid messages to send. Please try again.');
  }

  const lastMessage = validMessages[validMessages.length - 1];
  if (!lastMessage.content || lastMessage.content.trim().length === 0) {
    throw new Error('Message cannot be empty.');
  }
  if (lastMessage.content.trim().length > 32_000) {
    throw new Error('Message is too long. Please shorten it and try again.');
  }

  // ── 2. Convert to Gemini format ────────────────────────────────────────────
  const geminiMessages: GeminiMessage[] = validMessages.map(m => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  // ── 3. Retry loop ──────────────────────────────────────────────────────────
  let lastError: GeminiRequestError | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    // Honour external cancellation before each attempt
    if (externalSignal?.aborted) {
      throw new Error('Request was cancelled.');
    }

    try {
      const text = await attemptGeminiCall(
        geminiMessages,
        externalSignal ?? new AbortController().signal,
      );
      // Success — return immediately, no error shown regardless of prior failures
      return text;
    } catch (err: any) {
      // Always log the raw error in dev for diagnostics
      if (import.meta.env.DEV) {
        console.error(`[callGemini] Attempt ${attempt + 1} failed:`, err);
      }

      if (!(err instanceof GeminiRequestError)) {
        // Unexpected error type — do not retry
        throw new Error(err?.message ?? 'An unexpected error occurred.');
      }

      lastError = err;

      // Do not retry non-retryable errors (400, 401, 403, or explicit cancel)
      if (!err.retryable || externalSignal?.aborted) {
        throw new Error(err.message);
      }

      // No more retries left
      if (attempt === MAX_RETRIES) break;

      const delayMs = RETRY_DELAYS_MS[attempt];

      if (import.meta.env.DEV) {
        console.warn(
          `[callGemini] Retrying in ${delayMs / 1000}s (attempt ${attempt + 1}/${MAX_RETRIES})…`,
        );
      }

      await sleep(delayMs);
    }
  }

  // All retries exhausted
  throw new Error(
    lastError?.message ?? 'Failed to reach the AI service. Please try again.',
  );
}

// ── Firestore persistence ─────────────────────────────────────────────────────

export async function loadConversations(): Promise<ChatConversation[]> {
  try {
    const q    = query(convCollection(), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
      } as ChatConversation;
    });
  } catch (err) {
    console.error('[aiChat] loadConversations error:', err);
    return [];
  }
}

/**
 * Recursively removes `undefined` values from an object/array tree.
 * Firestore's setDoc()/updateDoc() reject any `undefined` field, including
 * ones nested inside arrays or sub-objects (e.g. a message inside
 * conv.messages). This is a defensive safety net so a future optional
 * field added to ChatConversation/ChatMessage can't silently reintroduce
 * this class of bug.
 */
function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value.map(stripUndefinedDeep) as unknown as T;
  }
  // Only recurse into plain objects ({ ... } literals). Firestore sentinels
  // (serverTimestamp(), Timestamp instances, GeoPoint, etc.) are class
  // instances with their own prototype — recursing into them would strip
  // their internal fields and break them. Leave anything non-plain alone.
  const isPlainObject =
    value !== null &&
    typeof value === 'object' &&
    (value as object).constructor === Object;

  if (isPlainObject) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, stripUndefinedDeep(v)]),
    ) as T;
  }
  return value;
}

export async function saveConversation(conv: ChatConversation): Promise<void> {
  try {
    await setDoc(
      doc(convCollection(), conv.id),
      stripUndefinedDeep({ ...conv, updatedAt: serverTimestamp() }),
      { merge: true },
    );
  } catch (err) {
    console.error('[aiChat] saveConversation error:', err);
    // Non-fatal — conversation remains usable in memory
  }
}

export async function deleteConversation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(convCollection(), id));
  } catch (err) {
    console.error('[aiChat] deleteConversation error:', err);
    throw err;
  }
}

export function createConversation(): ChatConversation {
  const now = new Date().toISOString();
  return {
    id:        generateId(),
    title:     'New Conversation',
    messages:  [],
    createdAt: now,
    updatedAt: now,
  };
}

export function buildUpdatedConversation(
  conv:           ChatConversation,
  userMessage:    ChatMessage,
  assistantReply: ChatMessage,
): ChatConversation {
  const messages = [...conv.messages, userMessage, assistantReply];
  const isFirst  = conv.messages.length === 0;
  return {
    ...conv,
    title:     isFirst ? makeTitle(userMessage.content) : conv.title,
    messages,
    updatedAt: new Date().toISOString(),
  };
}

export function makeUserMessage(text: string): ChatMessage {
  return {
    id:        generateId(),
    role:      'user',
    content:   text.trim(),
    createdAt: new Date().toISOString(),
  };
}

export function makeAssistantMessage(
  text: string,
  opts?: { streaming?: boolean; error?: boolean },
): ChatMessage {
  return {
    id:        generateId(),
    role:      'assistant',
    content:   text,
    createdAt: new Date().toISOString(),
    // Only include these keys when explicitly true — Firestore's setDoc()
    // rejects `undefined` anywhere in the document tree (including inside
    // arrays), so we must not store the literal `undefined` here.
    ...(opts?.streaming ? { streaming: true } : {}),
    ...(opts?.error ? { error: true } : {}),
  };
}