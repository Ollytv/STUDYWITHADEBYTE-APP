// functions/api/ai-chat.ts
//
// Cloudflare Pages Function — POST /api/ai-chat
// Multi-provider AI gateway with automatic fallback:
// Gemini -> Groq -> DeepSeek -> OpenRouter. API keys never leave this function.

import { ChatMessage, Env, ProviderError } from './_lib/types';
import { routeGenerateResponse } from './_lib/router';
import { verifyFirebaseToken, AuthError } from './_lib/auth';
import { checkRateLimit, RateLimitError } from './_lib/rateLimit';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

function json(status: number, body: Record<string, unknown>, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS, ...extraHeaders },
  });
}

/** Never exposes raw provider error text to the client. */
function friendlyError(status: number): string {
  if (status === 429) return 'The AI service is temporarily busy. Please wait a moment and try again.';
  if (status === 401 || status === 403) return 'Authentication error. Please refresh the page and try again.';
  if (status === 400) return 'Your message could not be processed. Please try rephrasing it.';
  return "We're having trouble reaching the AI service. Please try again in a moment.";
}

function parseMessages(body: unknown): ChatMessage[] {
  if (typeof body !== 'object' || body === null || !Array.isArray((body as any).messages)) {
    throw new Error('messages must be a non-empty array');
  }
  const raw = (body as any).messages as unknown[];
  if (raw.length === 0) throw new Error('messages must be a non-empty array');

  return raw.map(m => {
    if (typeof m !== 'object' || m === null) throw new Error('Invalid message');
    const { role, content } = m as Record<string, unknown>;
    if (role !== 'user' && role !== 'assistant') throw new Error(`Invalid role: ${String(role)}`);
    if (typeof content !== 'string' || content.trim() === '') throw new Error('Message content must be a non-empty string');
    if (content.length > 32_000) throw new Error('Message is too long');
    return { role, content } as ChatMessage;
  });
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  // ── Auth ──────────────────────────────────────────────────────────────
  let uid: string;
  try {
    uid = await verifyFirebaseToken(request, env);
  } catch (err) {
    const status = err instanceof AuthError ? err.status : 401;
    return json(status, { error: friendlyError(status) });
  }

  // ── Rate limit (fail-open on KV errors — don't block chat over it) ────
  try {
    await checkRateLimit(uid, env);
  } catch (err) {
    if (err instanceof RateLimitError) {
      return json(429, { error: friendlyError(429) }, { 'Retry-After': String(err.retryAfterSeconds) });
    }
    console.error('[ai-chat] rate limit check failed:', err);
  }

  // ── Parse + validate body ──────────────────────────────────────────────
  let messages: ChatMessage[];
  try {
    messages = parseMessages(await request.json());
  } catch {
    return json(400, { error: friendlyError(400) });
  }

  // ── Route through providers ─────────────────────────────────────────────
  try {
    const result = await routeGenerateResponse(messages, env);
    console.log(`[ai-chat] uid=${uid} provider=${result.provider} latencyMs=${result.latencyMs} fallbackCount=${result.fallbackCount}`);
    return json(200, { text: result.text, provider: result.provider });
  } catch (err) {
    const perr = err instanceof ProviderError ? err : null;
    const status = perr?.status && perr.status >= 400 && perr.status < 600 ? perr.status : 502;
    console.error(`[ai-chat] uid=${uid} all providers failed:`, perr?.message ?? err);
    return json(status, { error: friendlyError(status) });
  }
};
