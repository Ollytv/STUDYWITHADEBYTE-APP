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

export const PROVIDER_TIMEOUT_MS = 8_000;

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

  const data = await response.json<any>();
  const text = data?.choices?.[0]?.message?.content;

  if (!text || typeof text !== 'string' || text.trim() === '') {
    throw new ProviderError(`${provider} returned an empty response`, provider, true, 500);
  }

  return text;
}
