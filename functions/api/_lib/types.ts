// functions/api/_lib/types.ts
//
// Shared types for the AI gateway. Provider-agnostic — no SDK-specific types here.

export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  role: ChatRole;
  content: string;
}

export type ProviderName = 'gemini' | 'groq' | 'deepseek' | 'openrouter';

export interface GenerateResult {
  text: string;
  provider: ProviderName;
  latencyMs: number;
  fallbackCount: number;
}

export interface AIProvider {
  readonly name: ProviderName;
  generateResponse(messages: ChatMessage[], env: Env): Promise<string>;
  generateTitle(firstMessage: string, env: Env): Promise<string>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly provider: ProviderName,
    public readonly retryable: boolean,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

export interface Env {
  // Provider secrets (set via `wrangler pages secret put`, never in wrangler.toml)
  GEMINI_API_KEY: string;
  GROQ_API_KEY: string;
  DEEPSEEK_API_KEY: string;
  OPENROUTER_API_KEY: string;

  // Models — never hardcoded in provider code
  GEMINI_MODEL: string;
  GROQ_MODEL: string;
  DEEPSEEK_MODEL: string;
  OPENROUTER_MODEL: string;

  // Firebase ID token verification
  FIREBASE_PROJECT_ID: string;

  // Rate limiting
  AI_RATE_LIMIT_PER_MINUTE: string; // Cloudflare vars are always strings

  // Bindings
  RATE_LIMIT_KV: KVNamespace;
}
