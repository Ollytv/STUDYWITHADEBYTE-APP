// functions/api/_lib/router.ts
//
// AIRouter: tries providers in priority order, retries transient failures
// once in place, and falls back to the next provider on any failure.
// Only throws once every provider (including its retry) has failed.

import { AIProvider, ChatMessage, Env, GenerateResult, ProviderError, ProviderName } from './types';
import { geminiProvider } from './providers/gemini';
import { groqProvider } from './providers/groq';
import { deepseekProvider } from './providers/deepseek';
import { openrouterProvider } from './providers/openrouter';
import { isSkippable, recordSuccess, recordFailure } from './health';

const PROVIDERS: Record<ProviderName, AIProvider> = {
  gemini: geminiProvider,
  groq: groqProvider,
  deepseek: deepseekProvider,
  openrouter: openrouterProvider,
};

const PROVIDER_ORDER: ProviderName[] = ['gemini', 'groq', 'deepseek', 'openrouter'];

// One same-provider retry after a short backoff for transient errors only
// (429 / timeout / 5xx / network). Kept short — latency budget matters more
// than exhausting retries on a single provider when three others are waiting.
const SAME_PROVIDER_RETRY_DELAY_MS = 500;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function tryProvider(provider: AIProvider, messages: ChatMessage[], env: Env): Promise<{ text: string; latencyMs: number }> {
  const start = Date.now();
  try {
    const text = await provider.generateResponse(messages, env);
    return { text, latencyMs: Date.now() - start };
  } catch (err) {
    const perr = err instanceof ProviderError ? err : new ProviderError(String(err), provider.name, true);
    if (!perr.retryable) throw perr;

    await sleep(SAME_PROVIDER_RETRY_DELAY_MS);
    const text = await provider.generateResponse(messages, env);
    return { text, latencyMs: Date.now() - start };
  }
}

export async function routeGenerateResponse(messages: ChatMessage[], env: Env): Promise<GenerateResult> {
  let lastError: ProviderError | null = null;
  let fallbackCount = 0;

  for (const name of PROVIDER_ORDER) {
    if (isSkippable(name)) {
      console.log(`[router] skipping ${name} — circuit open`);
      fallbackCount += 1;
      continue;
    }

    try {
      const { text, latencyMs } = await tryProvider(PROVIDERS[name], messages, env);
      recordSuccess(name, latencyMs);
      console.log(`[router] success provider=${name} latencyMs=${latencyMs} fallbackCount=${fallbackCount}`);
      return { text, provider: name, latencyMs, fallbackCount };
    } catch (err) {
      const perr = err instanceof ProviderError ? err : new ProviderError(String(err), name, true);
      recordFailure(name);
      console.error(`[router] provider=${name} failed: ${perr.message}`);
      lastError = perr;
      fallbackCount += 1;
    }
  }

  throw lastError ?? new ProviderError('All AI providers are unavailable', 'openrouter', false);
}

export async function routeGenerateTitle(firstMessage: string, env: Env): Promise<string> {
  for (const name of PROVIDER_ORDER) {
    if (isSkippable(name)) continue;
    try {
      return await PROVIDERS[name].generateTitle(firstMessage, env);
    } catch (err) {
      console.error(`[router] title generation failed on ${name}:`, err);
    }
  }
  throw new ProviderError('All AI providers are unavailable', 'openrouter', false);
}
