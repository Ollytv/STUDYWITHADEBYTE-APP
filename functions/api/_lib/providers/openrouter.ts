// functions/api/_lib/providers/openrouter.ts

import { Attachment, AIProvider, ChatMessage, Env, ProviderError } from '../types';
import { openAICompatibleChat, openAICompatibleVisionChat, PROVIDER_TIMEOUT_MS, VISION_PROVIDER_TIMEOUT_MS, withTimeout } from './base';

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

  // Vision fallback for images only. gpt-4o-mini (the currently configured
  // OPENROUTER_MODEL) supports image_url content parts reliably; arbitrary
  // PDF bytes are NOT well-supported through that same content-part shape
  // across OpenRouter's routed models, so PDFs deliberately do not fall
  // back here — a PDF-attachment request fails clearly if Gemini is down,
  // rather than silently sending garbage to a model that can't read it.
  generateVisionResponse(messages: ChatMessage[], attachment: Attachment, env: Env): Promise<string> {
    if (!env.OPENROUTER_API_KEY) throw new ProviderError('openrouter not configured', 'openrouter', false);
    if (attachment.kind !== 'image') {
      throw new ProviderError('openrouter vision only supports images', 'openrouter', false);
    }

    const userMsg = messages[messages.length - 1];
    const priorMessages = messages.slice(0, -1);

    return withTimeout(
      openAICompatibleVisionChat({
        url: OPENROUTER_URL, apiKey: env.OPENROUTER_API_KEY, model: env.OPENROUTER_MODEL,
        userText: userMsg?.content ?? '', priorMessages,
        mimeType: attachment.mimeType, dataBase64: attachment.dataBase64,
        provider: 'openrouter', extraHeaders: EXTRA_HEADERS,
      }),
      VISION_PROVIDER_TIMEOUT_MS,
      'openrouter',
    );
  },
};