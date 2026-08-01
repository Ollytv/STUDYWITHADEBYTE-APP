// functions/api/ai-chat.ts
//
// Cloudflare Pages Function — POST /api/ai-chat
// Multi-provider AI gateway with automatic fallback:
// Gemini -> Groq -> DeepSeek -> OpenRouter. API keys never leave this function.
//
// Attachment requests (image/PDF) use a narrower vision-only fallback chain
// (Gemini -> OpenRouter) — see routeGenerateVisionResponse.

import { Attachment, AttachmentKind, ChatMessage, Env, ProviderError } from './_lib/types';
import { routeGenerateResponse, routeGenerateVisionResponse } from './_lib/router';
import { verifyFirebaseToken, AuthError } from './_lib/auth';
import { checkRateLimit, checkVisionRateLimit, RateLimitError } from './_lib/rateLimit';


const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Attachment size limit — matches the client's MAX_AI_ATTACHMENT_MB in
// src/services/storage.ts. Checked again here server-side since the client
// check is only a UX convenience, never a security boundary.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

const ALLOWED_ATTACHMENT_MIME_TYPES: Record<string, AttachmentKind> = {
  'image/jpeg': 'image',
  'image/jpg': 'image',
  'image/png': 'image',
  'image/webp': 'image',
  'application/pdf': 'pdf',
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

function parseMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new Error('messages must be a non-empty array');
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

/**
 * Validates and normalizes the optional `attachment` field. Never trusts
 * the client's declared mimeType/kind alone — re-checks the allowlist and
 * decoded byte size here, since this is the actual security boundary.
 */
function parseAttachment(raw: unknown): Attachment | null {
  if (raw === undefined || raw === null) return null;
  if (typeof raw !== 'object') throw new Error('Invalid attachment');

  const { mimeType, dataBase64 } = raw as Record<string, unknown>;
  if (typeof mimeType !== 'string' || !(mimeType in ALLOWED_ATTACHMENT_MIME_TYPES)) {
    throw new Error('Unsupported attachment type. Please upload a JPG, PNG, WEBP, or PDF file.');
  }
  if (typeof dataBase64 !== 'string' || dataBase64.length === 0) {
    throw new Error('Attachment data is missing.');
  }

  // Base64 inflates size by ~4/3 — approximate decoded size without actually
  // decoding (cheap check before doing real work).
  const approxDecodedBytes = Math.floor((dataBase64.length * 3) / 4);
  if (approxDecodedBytes > MAX_ATTACHMENT_BYTES) {
    throw new Error(`Attachment is too large. Maximum size is ${MAX_ATTACHMENT_BYTES / 1024 / 1024}MB.`);
  }

  return { mimeType, dataBase64, kind: ALLOWED_ATTACHMENT_MIME_TYPES[mimeType] };
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

  // ── Parse + validate body ──────────────────────────────────────────────
  let messages: ChatMessage[];
  let attachment: Attachment | null;
  try {
    const body = await request.json();
    if (typeof body !== 'object' || body === null) throw new Error('Invalid request body');
    messages = parseMessages((body as any).messages);
    attachment = parseAttachment((body as any).attachment);
  } catch (err) {
    console.error('[ai-chat] validation failed:', err);
    return json(400, { error: err instanceof Error && err.message.length < 200 ? err.message : friendlyError(400) });
  }

  // ── Rate limit (fail-open on KV errors — don't block chat over it) ────
  // Attachment requests draw from the stricter vision budget instead of the
  // general chat budget — they're materially more expensive per call.
  try {
    if (attachment) {
      await checkVisionRateLimit(uid, env);
    } else {
      await checkRateLimit(uid, env);
    }
  } catch (err) {
    if (err instanceof RateLimitError) {
      return json(429, { error: friendlyError(429) }, { 'Retry-After': String(err.retryAfterSeconds) });
    }
    console.error('[ai-chat] rate limit check failed:', err);
  }

  // ── Route through providers ─────────────────────────────────────────────
  try {
    const result = attachment
      ? await routeGenerateVisionResponse(messages, attachment, env)
      : await routeGenerateResponse(messages, env);
    console.log(`[ai-chat] uid=${uid} provider=${result.provider} latencyMs=${result.latencyMs} fallbackCount=${result.fallbackCount} attachment=${!!attachment}`);
    return json(200, { text: result.text, provider: result.provider });
  } catch (err) {
    const perr = err instanceof ProviderError ? err : null;
    const status = perr?.status && perr.status >= 400 && perr.status < 600 ? perr.status : 502;
    console.error(`[ai-chat] uid=${uid} all providers failed:`, perr?.message ?? err);
    // Attachment-specific message so the user understands this is a vision
    // outage, not a general chat outage — the two chains fail independently.
    const message = attachment
      ? 'Vision analysis is temporarily unavailable. Please try again shortly.'
      : friendlyError(status);
    return json(status, { error: message });
  }
};