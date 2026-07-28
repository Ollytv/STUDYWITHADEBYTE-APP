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

export type AttachmentKind = 'image' | 'pdf';

export interface Attachment {
  mimeType: string;
  /** Raw base64 payload, no data: URL prefix. */
  dataBase64: string;
  kind: AttachmentKind;
}

export interface AIProvider {
  readonly name: ProviderName;
  generateResponse(messages: ChatMessage[], env: Env): Promise<string>;
  generateTitle(firstMessage: string, env: Env): Promise<string>;
  /**
   * Optional — only providers with multimodal support implement this.
   * Router checks for its presence before including a provider in the
   * vision fallback chain (see routeGenerateVisionResponse).
   */
  generateVisionResponse?(messages: ChatMessage[], attachment: Attachment, env: Env): Promise<string>;
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

// Minimal local shape for the Workers KV binding — covers only the methods
// this project actually calls (rateLimit.ts's get/put). Avoids depending on
// @cloudflare/workers-types' ambient global KVNamespace being available in
// this tsconfig's "types" array; if that package IS configured project-wide,
// this structural type is still assignment-compatible with the real one.
export interface KVNamespaceLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
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
  AI_VISION_RATE_LIMIT_PER_MINUTE: string;

  // Bindings
  RATE_LIMIT_KV: KVNamespaceLike;
}