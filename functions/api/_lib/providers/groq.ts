// functions/api/_lib/providers/groq.ts

import { AIProvider, ChatMessage, Env, ProviderError } from '../types';
import { openAICompatibleChat, PROVIDER_TIMEOUT_MS, withTimeout } from './base';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const groqProvider: AIProvider = {
  name: 'groq',

  generateResponse(messages: ChatMessage[], env: Env): Promise<string> {
    if (!env.GROQ_API_KEY) throw new ProviderError('groq not configured', 'groq', false);
    return withTimeout(
      openAICompatibleChat({ url: GROQ_URL, apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, messages, provider: 'groq' }),
      PROVIDER_TIMEOUT_MS,
      'groq',
    );
  },

  generateTitle(firstMessage: string, env: Env): Promise<string> {
    if (!env.GROQ_API_KEY) throw new ProviderError('groq not configured', 'groq', false);
    const prompt: ChatMessage[] = [{ role: 'user', content: `Summarize this in a short 5-word title, no punctuation: "${firstMessage.slice(0, 500)}"` }];
    return withTimeout(
      openAICompatibleChat({ url: GROQ_URL, apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, messages: prompt, provider: 'groq', maxTokens: 20 }),
      PROVIDER_TIMEOUT_MS,
      'groq',
    );
  },
};
