import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

/**
 * Get or initialize the OpenRouter client.
 * OpenRouter uses an OpenAI-compatible API, so we use the OpenAI SDK
 * with a custom base URL pointing to OpenRouter.
 */
export function getOpenRouterClient(): OpenAI | null {
  if (!openaiClient) {
    const key = process.env.OPENROUTER_API_KEY;
    if (!key) {
      console.warn("OPENROUTER_API_KEY is not defined — functioning in simulation mode.");
      return null;
    }
    openaiClient = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: key,
      defaultHeaders: {
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Client Hunter",
      },
    });
  }
  return openaiClient;
}

/**
 * Free models available on OpenRouter (as of May 2026).
 * - `openrouter/free`: Auto-routes to any available free provider
 * - Individual `:free` suffixed models can be used directly
 *
 * The auto-router is preferred — it handles provider availability and
 * load-balancing automatically.
 */
const FREE_MODEL = "openrouter/free";

/**
 * Fallback free models if the auto-router fails.
 * These are individual `:free` models that can be tried directly.
 */
const FREE_FALLBACK_MODELS = [
  "meta-llama/llama-3.3-70b-instruct:free",
  "meta-llama/llama-3.2-3b-instruct:free",
  "qwen/qwen3-next-80b-a3b-instruct:free",
];

/**
 * Generate content using OpenRouter (with Groq fallback) with a system prompt and user content.
 * Returns the text response, or null if unavailable.
 */
export async function generateContent(
  systemPrompt: string,
  userContent: string,
  options?: {
    model?: string;
    temperature?: number;
    responseFormat?: "json_object" | "text";
  },
): Promise<string | null> {
  // Try OpenRouter first
  const client = getOpenRouterClient();
  if (client) {
    try {
      const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      if (systemPrompt) {
        messages.push({ role: "system", content: systemPrompt });
      }
      messages.push({ role: "user", content: userContent });

      const modelToUse = options?.model ?? FREE_MODEL;

      // Try primary model first
      try {
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages,
          temperature: options?.temperature ?? 0.7,
          ...(options?.responseFormat === "json_object"
            ? { response_format: { type: "json_object" } }
            : {}),
        });
        const content = response.choices[0]?.message?.content ?? null;
        if (content) return content;
      } catch (firstErr: any) {
        console.warn(`[OpenRouter] Model "${modelToUse}" failed, trying fallback models:`, firstErr.message);
      }

      // Try fallback free models
      for (const fallbackModel of FREE_FALLBACK_MODELS) {
        if (options?.model && options.model !== FREE_MODEL) break; // skip if user specified a custom model
        try {
          const response = await client.chat.completions.create({
            model: fallbackModel,
            messages,
            temperature: options?.temperature ?? 0.7,
            ...(options?.responseFormat === "json_object"
              ? { response_format: { type: "json_object" } }
              : {}),
          });
          const content = response.choices[0]?.message?.content ?? null;
          if (content) return content;
        } catch (fallbackErr: any) {
          console.warn(`[OpenRouter] Fallback model "${fallbackModel}" also failed:`, fallbackErr.message);
        }
      }

      console.warn('[OpenRouter] All models exhausted, falling back to Groq...');
    } catch (err: any) {
      console.warn('[OpenRouter] Unexpected error, falling back to Groq:', err.message);
    }
  }

  // Fallback to Groq
  try {
    const { isGroqConfigured, generateWithGroq } = await import('./groq.js');
    if (isGroqConfigured()) {
      const result = await generateWithGroq(systemPrompt, userContent, {
        temperature: options?.temperature ?? 0.7,
      });
      if (result) return result;
    }
  } catch (err: any) {
    console.warn('[Groq] Fallback failed:', err.message);
  }

  return null;
}

/**
 * Generate a chat completion from a conversation history.
 * Uses OpenRouter with Groq fallback.
 */
export async function generateChatCompletion(
  messages: { role: string; content: string }[],
  systemInstruction?: string,
  options?: {
    model?: string;
    temperature?: number;
  },
): Promise<string | null> {
  // Try OpenRouter first
  const client = getOpenRouterClient();
  if (client) {
    try {
      const formattedMessages: { role: "system" | "user" | "assistant"; content: string }[] = [];
      if (systemInstruction) {
        formattedMessages.push({ role: "system", content: systemInstruction });
      }
      for (const m of messages) {
        formattedMessages.push({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        });
      }

      const modelToUse = options?.model ?? FREE_MODEL;

      // Try primary model first
      try {
        const response = await client.chat.completions.create({
          model: modelToUse,
          messages: formattedMessages,
          temperature: options?.temperature ?? 0.7,
        });
        const content = response.choices[0]?.message?.content ?? null;
        if (content) return content;
      } catch (firstErr: any) {
        console.warn(`[OpenRouter] Chat model "${modelToUse}" failed, trying fallbacks:`, firstErr.message);
      }

      // Try fallback free models
      for (const fallbackModel of FREE_FALLBACK_MODELS) {
        if (options?.model && options.model !== FREE_MODEL) break;
        try {
          const response = await client.chat.completions.create({
            model: fallbackModel,
            messages: formattedMessages,
            temperature: options?.temperature ?? 0.7,
          });
          const content = response.choices[0]?.message?.content ?? null;
          if (content) return content;
        } catch (fallbackErr: any) {
          console.warn(`[OpenRouter] Chat fallback "${fallbackModel}" failed:`, fallbackErr.message);
        }
      }

      console.warn('[OpenRouter] All chat models exhausted, falling back to Groq...');
    } catch (err: any) {
      console.warn('[OpenRouter] Unexpected chat error, falling back to Groq:', err.message);
    }
  }

  // Fallback to Groq
  try {
    const { isGroqConfigured, chatWithGroq } = await import('./groq.js');
    if (isGroqConfigured()) {
      const result = await chatWithGroq(messages, systemInstruction, {
        temperature: options?.temperature ?? 0.7,
      });
      if (result) return result;
    }
  } catch (err: any) {
    console.warn('[Groq] Chat fallback failed:', err.message);
  }

  return null;
}
