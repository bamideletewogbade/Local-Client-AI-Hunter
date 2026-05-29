/**
 * AI Client Hunter — Groq Client
 *
 * Provides an OpenAI-compatible client for Groq's API.
 * Used as a fallback when OpenRouter is unavailable.
 *
 * Groq uses the same OpenAI SDK format with a different base URL.
 */

import OpenAI from 'openai';

let groqClient: OpenAI | null = null;

/**
 * Get or initialize the Groq client.
 * Groq provides ultra-fast inference on open-source models.
 */
export function getGroqClient(): OpenAI | null {
  if (!groqClient) {
    const key = process.env.GROQ_API_KEY;
    if (!key) {
      console.warn("GROQ_API_KEY is not defined — Groq fallback unavailable.");
      return null;
    }
    groqClient = new OpenAI({
      baseURL: "https://api.groq.com/openai/v1",
      apiKey: key,
    });
  }
  return groqClient;
}

/**
 * Groq Free-Tier Models (as of May 2026).
 * All models on Groq are accessible via the free tier with rate limits.
 * 
 * - `llama-3.3-70b-versatile`: Best quality-to-speed ratio (default)
 * - `llama-3.1-8b-instant`: Fastest, lightweight fallback
 * - `meta-llama/llama-4-scout-17b-16e-instruct`: Newer model, great for chat
 * - `qwen/qwen3-32b`: Strong open-source alternative
 */
export const GROQ_DEFAULT_MODEL = "llama-3.3-70b-versatile";

/**
 * Ordered fallback chain for Groq models.
 * Tries each in sequence if the primary fails.
 */
export const GROQ_FALLBACK_MODELS = [
  "meta-llama/llama-4-scout-17b-16e-instruct",
  "qwen/qwen3-32b",
  "llama-3.1-8b-instant",
];

/**
 * Check if Groq is configured.
 */
export function isGroqConfigured(): boolean {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Generate content using Groq.
 * Returns the text response, or null if unavailable.
 */
export async function generateWithGroq(
  systemPrompt: string,
  userContent: string,
  options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
  },
): Promise<string | null> {
  const client = getGroqClient();
  if (!client) return null;

  try {      const modelToUse = options?.model ?? GROQ_DEFAULT_MODEL;

      // Try primary model
      try {
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userContent },
          ],
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 4096,
        });
        const content = response.choices[0]?.message?.content ?? null;
        if (content) return content;
      } catch (primaryErr: any) {
        console.warn(`[Groq] Primary model "${modelToUse}" failed:`, primaryErr.message);
      }

      // Try fallback models in sequence
      const fallbacks = options?.model ? [] : GROQ_FALLBACK_MODELS;
      for (const fallbackModel of fallbacks) {
        try {
          const response = await client.chat.completions.create({
            model: fallbackModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userContent },
            ],
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens ?? 4096,
          });
          const content = response.choices[0]?.message?.content ?? null;
          if (content) return content;
        } catch (fallbackErr: any) {
          console.warn(`[Groq] Fallback "${fallbackModel}" failed:`, fallbackErr.message);
        }
      }

      console.error('[Groq] All models exhausted for generateWithGroq');
      return null;
    }
}

/**
 * Generate a chat completion from a conversation history using Groq.
 */
export async function chatWithGroq(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  options?: {
    model?: string;
    temperature?: number;
  },
): Promise<string | null> {
  const client = getGroqClient();
  if (!client) return null;

  try {
    const formattedMessages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [];
    if (systemInstruction) {
      formattedMessages.push({ role: 'system', content: systemInstruction });
    }
    for (const m of messages) {
      formattedMessages.push({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.content,
      });
    }      const modelToUse = options?.model ?? GROQ_DEFAULT_MODEL;

      // Try primary model first
      try {
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: formattedMessages,
          temperature: options?.temperature ?? 0.7,
        });
        const content = response.choices[0]?.message?.content ?? null;
        if (content) return content;
      } catch (primaryErr: any) {
        console.warn(`[Groq] Chat model "${modelToUse}" failed:`, primaryErr.message);
      }

      // Try fallback models in sequence
      const fallbacks = options?.model ? [] : GROQ_FALLBACK_MODELS;
      for (const fallbackModel of fallbacks) {
        try {
          const response = await client.chat.completions.create({
            model: fallbackModel,
            messages: formattedMessages,
            temperature: options?.temperature ?? 0.7,
          });
          const content = response.choices[0]?.message?.content ?? null;
          if (content) return content;
        } catch (fallbackErr: any) {
          console.warn(`[Groq] Chat fallback "${fallbackModel}" failed:`, fallbackErr.message);
        }
      }

      console.error('[Groq] All chat models exhausted');
      return null;
    }
}
