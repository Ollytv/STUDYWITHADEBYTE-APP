// netlify/functions/gemini.ts
//
// Serverless proxy for Google Gemini API, powered by the official @google/genai SDK.
// The GEMINI_API_KEY environment variable is only accessible here —
// it is NEVER sent to the browser under any circumstance.
//
// Endpoint: POST /.netlify/functions/gemini
// Body:     { messages: { role: 'user'|'model', parts: [{ text: string }] }[] }
// Response: { text: string } | { error: string }

import type { Handler, HandlerEvent } from '@netlify/functions';
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

// gemini-2.0-flash is GA, fast, and stable. Do NOT use preview/experimental
// model strings in production — they are the primary cause of 503 errors.
const GEMINI_MODEL = 'gemini-2.0-flash';

/**
 * Hard timeout (ms) for the Gemini SDK call.
 * Netlify's default function timeout is 10 s. We abort at 8 s so the function
 * can return a clean error response before Netlify kills it with a 502.
 */
const SDK_TIMEOUT_MS = 8_000;

const SYSTEM_INSTRUCTION = `You are StudiByte AI, an intelligent academic assistant built into the StudiByte student productivity app.

Your role:
- Help students understand course material, solve problems, and prepare for exams
- Explain concepts clearly at the student's level
- Provide structured study tips and learning strategies
- Help with assignments (guide, don't just give answers)
- Support a wide range of subjects: sciences, arts, engineering, business, and more

Response style:
- Be encouraging, clear, and concise
- Use markdown formatting: **bold**, bullet lists, numbered steps, code blocks, tables
- For code, always specify the language in the code fence
- Keep responses focused — don't pad with unnecessary text
- If you don't know something, say so honestly

You are NOT a general-purpose chatbot. Politely redirect off-topic requests back to academic topics.`;

interface GeminiPart    { text: string }
interface GeminiMessage { role: 'user' | 'model'; parts: GeminiPart[] }

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(statusCode: number, body: Record<string, unknown>) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: JSON.stringify(body),
  };
}

/**
 * Wrap a promise with a hard timeout.
 * Rejects with a structured error that the catch block can inspect.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(Object.assign(new Error('Gemini SDK call timed out'), { timedOut: true }));
    }, ms);

    promise.then(
      val  => { clearTimeout(timer); resolve(val); },
      err  => { clearTimeout(timer); reject(err);  },
    );
  });
}

export const handler: Handler = async (event: HandlerEvent) => {
  // ── CORS preflight ──────────────────────────────────────────────────────
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  // ── API key guard ───────────────────────────────────────────────────────
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini] GEMINI_API_KEY environment variable is not set.');
    return jsonResponse(500, { error: 'AI service is not configured. Please contact support.' });
  }

  // ── Parse + validate body ───────────────────────────────────────────────
  let messages: GeminiMessage[];
  try {
    const body = JSON.parse(event.body || '{}');
    messages   = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }

    // Basic structural validation — reject malformed payloads early
    for (const msg of messages) {
      if (msg.role !== 'user' && msg.role !== 'model') {
        throw new Error(`Invalid role: ${msg.role}`);
      }
      if (!Array.isArray(msg.parts) || !msg.parts[0]?.text) {
        throw new Error('Each message must have a parts array with at least one text part');
      }
    }
  } catch (err) {
    return jsonResponse(400, { error: 'Invalid request body.' });
  }

  // ── Call Gemini via the official SDK ────────────────────────────────────
  try {
    const ai = new GoogleGenAI({ apiKey });

    const sdkCall = ai.models.generateContent({
      model:    GEMINI_MODEL,
      contents: messages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature:       0.7,
        topK:              40,
        topP:              0.95,
        maxOutputTokens:   2048,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });

    // Apply hard timeout so we return a clean 504 instead of being killed
    // mid-execution by Netlify, which produces an opaque 502.
    const response = await withTimeout(sdkCall, SDK_TIMEOUT_MS);
    const text     = response.text;

    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.error('[gemini] Empty response from SDK:', JSON.stringify(response));
      return jsonResponse(500, { error: 'AI returned an empty response. Please try again.' });
    }

    return jsonResponse(200, { text });

  } catch (err: any) {
    // ── Timeout ───────────────────────────────────────────────────────────
    if (err?.timedOut) {
      console.error('[gemini] SDK call timed out after', SDK_TIMEOUT_MS, 'ms');
      return jsonResponse(504, {
        error: "We're having trouble reaching the AI service. Please try again in a moment.",
      });
    }

    // ── Gemini API errors — ApiError exposes .status ──────────────────────
    const status = err?.status as number | undefined;

    if (status) {
      console.error(`[gemini] API error ${status}:`, err.message);

      if (status === 429) {
        return jsonResponse(429, {
          error: 'The AI service is temporarily busy. Please wait a moment and try again.',
        });
      }
      if (status === 400) {
        return jsonResponse(400, {
          error: 'Your message could not be processed. Please try rephrasing it.',
        });
      }
      if (status === 401 || status === 403) {
        return jsonResponse(status, {
          error: 'Authentication error with the AI service. Please contact support.',
        });
      }
      // 500, 502, 503, 504 from Gemini — propagate the same code so the
      // client retry logic can identify it as retryable
      return jsonResponse(status, {
        error: "We're having trouble reaching the AI service. Please try again in a moment.",
      });
    }

    // ── Unknown / network error ───────────────────────────────────────────
    console.error('[gemini] Unexpected error:', err);
    return jsonResponse(502, {
      error: "We're having trouble reaching the AI service. Please try again in a moment.",
    });
  }
};