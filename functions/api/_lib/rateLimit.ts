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

export async function checkRateLimit(uid: string, env: Env): Promise<void> {
  const limit = Number(env.AI_RATE_LIMIT_PER_MINUTE) || 15;
  const windowStart = Math.floor(Date.now() / (WINDOW_SECONDS * 1000));
  const key = `ratelimit:${uid}:${windowStart}`;

  const current = Number((await env.RATE_LIMIT_KV.get(key)) ?? '0');
  if (current >= limit) throw new RateLimitError(WINDOW_SECONDS);

  await env.RATE_LIMIT_KV.put(key, String(current + 1), { expirationTtl: WINDOW_SECONDS + 10 });
}
