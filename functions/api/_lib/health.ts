// functions/api/_lib/health.ts
//
// Lightweight circuit breaker. State lives in module scope, so it persists
// for the life of a warm Worker isolate and resets on cold start — that's
// intentional, it avoids a KV round-trip on every single chat request. If
// cross-isolate consistency becomes necessary, back this with KV or a
// Durable Object instead.

import { ProviderName } from './types';

interface ProviderHealthState {
  consecutiveFailures: number;
  lastFailureAt: number | null;
  lastSuccessAt: number | null;
  totalRequests: number;
  totalFailures: number;
  avgLatencyMs: number;
}

const UNHEALTHY_THRESHOLD = 3;
const COOLDOWN_MS = 60_000;

const state = new Map<ProviderName, ProviderHealthState>();

function getState(name: ProviderName): ProviderHealthState {
  let s = state.get(name);
  if (!s) {
    s = { consecutiveFailures: 0, lastFailureAt: null, lastSuccessAt: null, totalRequests: 0, totalFailures: 0, avgLatencyMs: 0 };
    state.set(name, s);
  }
  return s;
}

/** True while a provider is tripped (≥3 consecutive failures, within the cooldown window). */
export function isSkippable(name: ProviderName): boolean {
  const s = getState(name);
  if (s.consecutiveFailures < UNHEALTHY_THRESHOLD) return false;
  return Date.now() - (s.lastFailureAt ?? 0) < COOLDOWN_MS;
}

export function recordSuccess(name: ProviderName, latencyMs: number): void {
  const s = getState(name);
  s.consecutiveFailures = 0;
  s.lastSuccessAt = Date.now();
  s.totalRequests += 1;
  s.avgLatencyMs = s.avgLatencyMs === 0 ? latencyMs : s.avgLatencyMs * 0.8 + latencyMs * 0.2;
}

export function recordFailure(name: ProviderName): void {
  const s = getState(name);
  s.consecutiveFailures += 1;
  s.lastFailureAt = Date.now();
  s.totalRequests += 1;
  s.totalFailures += 1;
}

export function getHealthSnapshot(): Record<ProviderName, ProviderHealthState> {
  const names: ProviderName[] = ['gemini', 'groq', 'deepseek', 'openrouter'];
  return Object.fromEntries(names.map(n => [n, { ...getState(n) }])) as Record<ProviderName, ProviderHealthState>;
}
