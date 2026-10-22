import { callGemini, makeUserMessage } from './aiChat';
import { buildGenerationPrompt, parseGeneratedCards, MAX_NOTES_CHARS, GeneratedCard } from '../utils/flashcards';

/**
 * Turns study notes into draft flashcards through the existing AI gateway
 * (same auth, rate limiting, retries and provider fallback as the AI Assistant).
 * The caller reviews the drafts before anything is saved.
 *
 * @throws Error with a user-readable message on failure.
 */
export async function generateFlashcards(
  notes: string,
  count: number,
  signal?: AbortSignal,
): Promise<GeneratedCard[]> {
  const prompt = buildGenerationPrompt(notes.slice(0, MAX_NOTES_CHARS), count);
  const reply  = await callGemini([makeUserMessage(prompt)], signal);
  return parseGeneratedCards(reply, count);
}
