// src/services/aiChat.ts
//
// Client-side service for StudiByte AI Assistant.
// All Gemini API calls go through the Netlify serverless function —
// the API key is never present in this file or any frontend code.

import {
  collection, doc, getDoc, getDocs, setDoc,
  deleteDoc, query, orderBy, serverTimestamp, Timestamp,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { ChatConversation, ChatMessage } from '../types';
import { generateId } from '../utils/id';

// ── Helpers ───────────────────────────────────────────────────────────────────

function uid(): string {
  const user = auth.currentUser;
  if (!user) throw new Error('Not authenticated');
  return user.uid;
}

function convCollection() {
  return collection(db, 'users', uid(), 'conversations');
}

/** Truncate to 60 chars for conversation title */
function makeTitle(text: string): string {
  return text.trim().slice(0, 60) + (text.trim().length > 60 ? '…' : '');
}

// ── Gemini proxy call ─────────────────────────────────────────────────────────

interface GeminiMessage {
  role:  'user' | 'model';
  parts: { text: string }[];
}

/**
 * Send the full conversation history to the Netlify function and get
 * the assistant's reply text back.
 *
 * @throws Error with user-readable message on failure
 */
export async function callGemini(messages: ChatMessage[]): Promise<string> {
  // Convert ChatMessage[] → Gemini history format
  // Gemini uses 'model' instead of 'assistant'
  const geminiMessages: GeminiMessage[] = messages
    .filter(m => !m.error && !m.streaming)
    .map(m => ({
      role:  m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const response = await fetch('/.netlify/functions/gemini', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ messages: geminiMessages }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data.text as string;
}

// ── Firestore persistence ─────────────────────────────────────────────────────

/**
 * Load all conversations for the current user, sorted newest first.
 * Returns [] if not authenticated or no conversations exist.
 */
export async function loadConversations(): Promise<ChatConversation[]> {
  try {
    const q    = query(convCollection(), orderBy('updatedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map(d => {
      const data = d.data();
      return {
        ...data,
        id:        d.id,
        // Firestore Timestamps → ISO strings
        createdAt: data.createdAt instanceof Timestamp
          ? data.createdAt.toDate().toISOString()
          : data.createdAt,
        updatedAt: data.updatedAt instanceof Timestamp
          ? data.updatedAt.toDate().toISOString()
          : data.updatedAt,
      } as ChatConversation;
    });
  } catch (err) {
    console.error('[aiChat] loadConversations error:', err);
    return [];
  }
}

/**
 * Save (create or update) a conversation to Firestore.
 * Messages are stored inline on the document — suitable for typical
 * conversation lengths. If a conversation exceeds ~100 messages, consider
 * moving to a subcollection.
 */
export async function saveConversation(conv: ChatConversation): Promise<void> {
  try {
    await setDoc(
      doc(convCollection(), conv.id),
      {
        ...conv,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[aiChat] saveConversation error:', err);
    // Non-fatal — the conversation is still usable in memory
  }
}

/**
 * Delete a conversation from Firestore.
 */
export async function deleteConversation(id: string): Promise<void> {
  try {
    await deleteDoc(doc(convCollection(), id));
  } catch (err) {
    console.error('[aiChat] deleteConversation error:', err);
    throw err;
  }
}

/**
 * Create a brand-new empty conversation object (not yet saved to Firestore).
 */
export function createConversation(): ChatConversation {
  const now = new Date().toISOString();
  return {
    id:        generateId(),
    title:     'New Conversation',
    messages:  [],
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Build the updated conversation after a user message + assistant reply.
 * Returns the new conversation — caller is responsible for saving it.
 */
export function buildUpdatedConversation(
  conv:          ChatConversation,
  userMessage:   ChatMessage,
  assistantReply: ChatMessage,
): ChatConversation {
  const messages = [...conv.messages, userMessage, assistantReply];
  const isFirst  = conv.messages.length === 0;
  return {
    ...conv,
    title:     isFirst ? makeTitle(userMessage.content) : conv.title,
    messages,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Create a user ChatMessage object.
 */
export function makeUserMessage(text: string): ChatMessage {
  return {
    id:        generateId(),
    role:      'user',
    content:   text.trim(),
    createdAt: new Date().toISOString(),
  };
}

/**
 * Create an assistant ChatMessage object.
 */
export function makeAssistantMessage(text: string, opts?: { streaming?: boolean; error?: boolean }): ChatMessage {
  return {
    id:        generateId(),
    role:      'assistant',
    content:   text,
    createdAt: new Date().toISOString(),
    streaming: opts?.streaming,
    error:     opts?.error,
  };
}
