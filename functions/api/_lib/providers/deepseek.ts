// functions/api/_lib/providers/deepseek.ts

import { AIProvider, ChatMessage, Env, ProviderError } from '../types';
import { openAICompatibleChat, PROVIDER_TIMEOUT_MS, withTimeout } from './base';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export const deepseekProvider: AIProvider = {
  name: 'deepseek',

  generateResponse(messages: ChatMessage[], env: Env): Promise<string> {
    if (!env.DEEPSEEK_API_KEY) throw new ProviderError('deepseek not configured', 'deepseek', false);
    return withTimeout(
      openAICompatibleChat({ url: DEEPSEEK_URL, apiKey: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL, messages, provider: 'deepseek' }),
      PROVIDER_TIMEOUT_MS,
      'deepseek',
    );
  },

  generateTitle(firstMessage: string, env: Env): Promise<string> {
    if (!env.DEEPSEEK_API_KEY) throw new ProviderError('deepseek not configured', 'deepseek', false);
    const prompt: ChatMessage[] = [{ role: 'user', content: `Summarize this in a short 5-word title, no punctuation: "${firstMessage.slice(0, 500)}"` }];
    return withTimeout(
      openAICompatibleChat({ url: DEEPSEEK_URL, apiKey: env.DEEPSEEK_API_KEY, model: env.DEEPSEEK_MODEL, messages: prompt, provider: 'deepseek', maxTokens: 20 }),
      PROVIDER_TIMEOUT_MS,
      'deepseek',
    );
  },
};
