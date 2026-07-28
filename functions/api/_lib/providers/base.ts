// functions/api/_lib/providers/base.ts
//
// Shared helpers reused by every OpenAI-compatible provider (Groq, DeepSeek,
// OpenRouter) so request/error-handling logic isn't duplicated three times.

import { ChatMessage, ProviderError, ProviderName } from '../types';

export const SYSTEM_INSTRUCTION = `You are StudiByte AI, an intelligent academic assistant built into the StudiByte student productivity app.

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

/**
 * Appended only for attachment messages (see gemini.ts / openrouter.ts vision
 * paths). Asks the model to emit a machine-parseable material-context block
 * after its answer, so the client can cache the extraction once and reuse it
 * as plain-text context for every follow-up question — instead of re-sending
 * or re-analyzing the file on every turn.
 */
export const VISION_CONTEXT_INSTRUCTION = `
The student has attached a file. Analyze it fully and answer their message.

After your answer, add a new line containing exactly: ---MATERIAL CONTEXT---
Then write a thorough, dense, plain-text extraction of everything relevant in
the attachment (all text, questions, diagram descriptions, data) so it can be
reused as context for follow-up questions without re-analyzing the file. This
section is never shown to the student, so write it for another AI to read,
not for a human.`;

export const PROVIDER_TIMEOUT_MS = 8_000;
export const VISION_PROVIDER_TIMEOUT_MS = 15_000; // vision calls run longer than plain text

export function withTimeout<T>(promise: Promise<T>, ms: number, provider: ProviderName): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new ProviderError(`${provider} request timed out`, provider, true, 504));
    }, ms);
    promise.then(
      val => { clearTimeout(timer); resolve(val); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

function isRetryableStatus(status: number): boolean {
  return status === 429 || status >= 500;
}

interface OpenAICompatibleOptions {
  url: string;
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  provider: ProviderName;
  extraHeaders?: Record<string, string>;
  maxTokens?: number;
  temperature?: number;
}

/** Shared request path — Groq, DeepSeek, and OpenRouter all speak OpenAI's /chat/completions format. */
export async function openAICompatibleChat(opts: OpenAICompatibleOptions): Promise<string> {
  const {
    url, apiKey, model, messages, provider,
    extraHeaders = {}, maxTokens = 2048, temperature = 0.7,
  } = opts;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION },
          ...messages.map(m => ({ role: m.role, content: m.content })),
        ],
        max_tokens: maxTokens,
        temperature,
      }),
    });
  } catch {
    throw new ProviderError(`${provider} network error`, provider, true);
  }

  if (!response.ok) {
    const status = response.status;
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    console.error(`[${provider}] API error ${status}:`, bodyText.slice(0, 500));
    throw new ProviderError(`${provider} returned ${status}`, provider, isRetryableStatus(status), status);
  }

  const data = (await response.json()) as any;
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new ProviderError(`${provider} returned an empty response`, provider, true, 500);
  }

  return text;
}

interface OpenAICompatibleVisionOptions {
  url: string;
  apiKey: string;
  model: string;
  /** The user's message text accompanying the attachment. */
  userText: string;
  /** Prior conversation history — sent as plain text turns before the image. */
  priorMessages: ChatMessage[];
  mimeType: string;
  dataBase64: string;
  provider: ProviderName;
  extraHeaders?: Record<string, string>;
}

/**
 * OpenAI-compatible vision request — content is an array of parts
 * ({type:'text'} / {type:'image_url'}) instead of a plain string, only for
 * the final user turn. Only supports images; callers must not use this for
 * PDFs (OpenRouter's image_url part does not accept arbitrary PDF data).
 */
export async function openAICompatibleVisionChat(opts: OpenAICompatibleVisionOptions): Promise<string> {
  const { url, apiKey, model, userText, priorMessages, mimeType, dataBase64, provider, extraHeaders = {} } = opts;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_INSTRUCTION + '\n' + VISION_CONTEXT_INSTRUCTION },
          ...priorMessages.map(m => ({ role: m.role, content: m.content })),
          {
            role: 'user',
            content: [
              { type: 'text', text: userText || 'Analyze this file.' },
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${dataBase64}` } },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.5,
      }),
    });
  } catch {
    throw new ProviderError(`${provider} network error`, provider, true);
  }

  if (!response.ok) {
    const status = response.status;
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    console.error(`[${provider}] vision API error ${status}:`, bodyText.slice(0, 500));
    throw new ProviderError(`${provider} returned ${status}`, provider, isRetryableStatus(status), status);
  }

  const data = (await response.json()) as any;
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new ProviderError(`${provider} returned an empty vision response`, provider, true, 500);
  }

  return text;
}