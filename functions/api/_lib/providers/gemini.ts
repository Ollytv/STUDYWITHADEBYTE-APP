// functions/api/_lib/providers/gemini.ts
//
// Primary provider. Calls Gemini's REST API directly (not the @google/genai
// SDK — it targets Node, not the Workers runtime) so it runs natively on
// Cloudflare's edge fetch().

import { AIProvider, ChatMessage, Env, ProviderError } from '../types';
import { SYSTEM_INSTRUCTION, withTimeout, PROVIDER_TIMEOUT_MS } from './base';

interface GeminiPart { text: string }
interface GeminiContent { role: 'user' | 'model'; parts: GeminiPart[] }

function toGeminiContents(messages: ChatMessage[]): GeminiContent[] {
  return messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
}

async function call(model: string, apiKey: string, contents: GeminiContent[]): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      }),
    });
  } catch {
    throw new ProviderError('gemini network error', 'gemini', true);
  }

  if (!response.ok) {
    const status = response.status;
    let bodyText = '';
    try { bodyText = await response.text(); } catch { /* ignore */ }
    console.error('[gemini] API error', status, bodyText.slice(0, 500));
    throw new ProviderError(`gemini returned ${status}`, 'gemini', status === 429 || status >= 500, status);
  }

  const data = await response.json<any>();
  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || text.trim() === '') {
    const blockReason = data?.candidates?.[0]?.finishReason;
    console.error('[gemini] empty response, finishReason:', blockReason);
    // A safety block will fail identically on retry — don't waste a retry on it.
    throw new ProviderError('gemini returned an empty response', 'gemini', blockReason !== 'SAFETY', 500);
  }

  return text;
}

export const geminiProvider: AIProvider = {
  name: 'gemini',

  generateResponse(messages: ChatMessage[], env: Env): Promise<string> {
    if (!env.GEMINI_API_KEY) throw new ProviderError('gemini not configured', 'gemini', false);
    return withTimeout(call(env.GEMINI_MODEL, env.GEMINI_API_KEY, toGeminiContents(messages)), PROVIDER_TIMEOUT_MS, 'gemini');
  },

  generateTitle(firstMessage: string, env: Env): Promise<string> {
    if (!env.GEMINI_API_KEY) throw new ProviderError('gemini not configured', 'gemini', false);
    const prompt = `Summarize this in a short 5-word title, no punctuation: "${firstMessage.slice(0, 500)}"`;
    return withTimeout(
      call(env.GEMINI_MODEL, env.GEMINI_API_KEY, [{ role: 'user', parts: [{ text: prompt }] }]),
      PROVIDER_TIMEOUT_MS,
      'gemini',
    );
  },
};
