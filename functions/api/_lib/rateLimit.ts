// functions/api/_lib/rateLimit.ts
//
// Fixed-window per-user rate limit backed by Workers KV. KV writes aren't
// strongly consistent across edge locations, so this is a "good enough"
// abuse guard rather than an exact limiter — acceptable for this use case.

import { Env } from './types';

export class RateLimitError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super('Rate limit exceeded');
    this.name = 'RateLimitError';
  }
}

const WINDOW_SECONDS = 60;

async function checkWindow(key: string, limit: number, env: Env): Promise<void> {
  const current = Number((await env.RATE_LIMIT_KV.get(key)) ?? '0');
  if (current >= limit) throw new RateLimitError(WINDOW_SECONDS);
  await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS + 10 });
}

export async function checkRateLimit(uid: string, env: Env): Promise<void> {
  const limit = Number(env.AI_RATE_LIMIT_PER_MINUTE) || 15;
  const windowStart = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  await checkWindow(`ratelimit:${uid}:${windowStart}`, limit, env);
}

/**
 * Vision calls are more expensive than text calls (larger request bodies,
 * pricier per-token cost on both Gemini and OpenRouter), so they get their
 * own, stricter budget — independent of the general 15/min chat limit.
 */
export async function checkVisionRateLimit(uid: string, env: Env): Promise<void> {
  const limit = Number(env.AI_VISION_RATE_LIMIT_PER_MINUTE) || 5;
  const windowStart = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  await checkWindow(`visionratelimit:${uid}:${windowStart}`, limit, env);
}