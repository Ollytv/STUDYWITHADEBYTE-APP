// functions/api/_lib/providers/openrouter.ts

import { AIProvider, ChatMessage, Env, ProviderError } from '../types';
import { openAICompatibleChat, PROVIDER_TIMEOUT_MS, withTimeout } from './base';

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter requests these for attribution / dashboard analytics — optional
// but recommended by their docs.
const EXTRA_HEADERS = {
  'HTTP-Referer': 'https://studibyte.space',
  'X-Title': 'StudiByte AI Assistant',
};

export const openrouterProvider: AIProvider = {
  name: 'openrouter',

  generateResponse(messages: ChatMessage[], env: Env): Promise<string> {
    if (!env.OPENROUTER_API_KEY) throw new ProviderError('openrouter not configured', 'openrouter', false);
    return withTimeout(
      openAICompatibleChat({
        url: OPENROUTER_URL, apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL,
        messages, provider: 'openrouter', extraHeaders: EXTRA_HEADERS,
      }),
      PROVIDER_TIMEOUT_MS,
      'openrouter',
    );
  },

  generateTitle(firstMessage: string, env: Env): Promise<string> {
    if (!env.OPENROUTER_API_KEY) throw new ProviderError('openrouter not configured', 'openrouter', false);
    const prompt: ChatMessage[] = [{ role: 'user', content: `Summarize this in a short 5-word title, no punctuation: "${firstMessage.slice(0, 500)}"` }];
    return withTimeout(
      openAICompatibleChat({
        url: OPENROUTER_URL, apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL,
        messages: prompt, provider: 'openrouter', extraHeaders: EXTRA_HEADERS, maxTokens: 20,
      }),
      PROVIDER_TIMEOUT_MS,
      'openrouter',
    );
  },
};
