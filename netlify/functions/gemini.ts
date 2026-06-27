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

// Recommended general-purpose text/multimodal model per the @google/genai SDK guidance.
const GEMINI_MODEL = 'gemini-3-flash-preview';

// System prompt — scopes the AI to academic assistance
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

// ── Shared response helpers (keep CORS headers consistent on every reply) ──
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

  // ── Parse body ──────────────────────────────────────────────────────────
  let messages: GeminiMessage[];
  try {
    const body = JSON.parse(event.body || '{}');
    messages   = body.messages;
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }
  } catch (err) {
    return jsonResponse(400, { error: 'Invalid request body.' });
  }

  // ── Call Gemini via the official SDK ────────────────────────────────────
  try {
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: messages,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature:     0.7,
        topK:            40,
        topP:            0.95,
        maxOutputTokens: 2048,
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT,        threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ],
      },
    });

    const text = response.text;

    if (!text) {
      console.error('[gemini] Unexpected response shape:', JSON.stringify(response));
      return jsonResponse(500, { error: 'AI returned an empty response. Please try again.' });
    }

    return jsonResponse(200, { text });

  } catch (err: any) {
    // ApiError from @google/genai exposes a `status` (HTTP code) plus `message`.
    const status = err?.status;

    if (status) {
      console.error(`[gemini] API error ${status}:`, err.message);
      return jsonResponse(status, {
        error: status === 429
          ? 'Too many requests. Please wait a moment and try again.'
          : `AI service error (${status}). Please try again.`,
      });
    }

    console.error('[gemini] Unexpected error:', err);
    return jsonResponse(502, { error: 'Could not reach the AI service. Check your connection.' });
  }
};