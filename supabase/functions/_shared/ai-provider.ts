/**
 * Centralized AI Provider Adapter for DogWork.
 * 
 * Single abstraction layer between Edge Functions and the AI provider.
 * Currently backed by Google Gemini via Google AI Studio (free tier).
 * 
 * To switch providers later, only this file needs to change.
 */

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";

// ─── API Key ───────────────────────────────────────────────

function getApiKey(): string {
  const key = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!key) throw new Error("GOOGLE_AI_API_KEY not configured");
  return key;
}

// ─── Model Mapping ─────────────────────────────────────────

const MODEL_MAP: Record<string, string> = {
  // Lovable AI model names → Gemini native names
  "google/gemini-2.5-flash": "gemini-2.5-flash",
  "google/gemini-2.5-flash-lite": "gemini-2.5-flash",
  "google/gemini-2.5-pro": "gemini-2.5-pro",
  "google/gemini-3-flash-preview": "gemini-2.5-flash",
  "google/gemini-3.1-pro-preview": "gemini-2.5-pro",
  "google/gemini-3-pro-image-preview": "gemini-2.5-flash-image-preview",
  "google/gemini-3.1-flash-image-preview": "gemini-2.5-flash-image-preview",
  "google/gemini-2.5-flash-image": "gemini-2.5-flash-image-preview",
  // OpenAI equivalents → Gemini
  "openai/gpt-5": "gemini-2.5-pro",
  "openai/gpt-5-mini": "gemini-2.5-flash",
  "openai/gpt-5-nano": "gemini-2.5-flash",
  "openai/gpt-5.2": "gemini-2.5-pro",
};

function mapModel(model: string): string {
  if (MODEL_MAP[model]) return MODEL_MAP[model];
  // Strip provider prefix as fallback
  const stripped = model.replace(/^(google|openai)\//, "");
  return stripped;
}

// ─── Text / Tool Calling (OpenAI-compatible endpoint) ──────

export interface AICompletionOptions {
  model: string;
  messages: Array<{ role: string; content: string }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  tools?: any[];
  tool_choice?: any;
}

/**
 * Call AI for text completion, streaming, or tool calling.
 * Uses Google's OpenAI-compatible endpoint so the response format
 * matches what the frontend already expects.
 * 
 * Returns the raw Response object (can be streamed directly to client).
 */
export async function callAI(options: AICompletionOptions): Promise<Response> {
  const apiKey = getApiKey();
  const model = mapModel(options.model);

  const body: Record<string, any> = {
    model,
    messages: options.messages,
    stream: options.stream ?? false,
  };

  if (options.temperature !== undefined) body.temperature = options.temperature;
  if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
  if (options.tools) body.tools = options.tools;
  if (options.tool_choice) body.tool_choice = options.tool_choice;

  return fetch(`${GEMINI_OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

// ─── Image Generation (Lovable AI Gateway) ─────────────────

const LOVABLE_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

export interface AIImageOptions {
  model: string;
  prompt: string;
}

export interface AIImageResult {
  /** data:image/png;base64,... URI or null on failure */
  imageData: string | null;
  error?: string;
  status?: number;
}

/**
 * Generate an image using the Lovable AI Gateway.
 * Falls back to direct Gemini API if LOVABLE_API_KEY is unavailable.
 * Returns a data URI (base64) compatible with existing upload logic.
 */
export async function generateImage(options: AIImageOptions): Promise<AIImageResult> {
  // Use direct Gemini API (5000 req/day quota on GOOGLE_AI_API_KEY).
  // Lovable Gateway is only used as fallback if Gemini key is missing.
  if (Deno.env.get("GOOGLE_AI_API_KEY")) {
    const result = await generateImageViaNative(options);
    if (result.imageData) return result;
    // If native fails and gateway key exists, try gateway as last resort
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (lovableKey) return generateImageViaGateway(lovableKey, options);
    return result;
  }

  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  if (lovableKey) return generateImageViaGateway(lovableKey, options);
  return { imageData: null, error: "No AI provider key configured" };
}

async function generateImageViaGateway(apiKey: string, options: AIImageOptions): Promise<AIImageResult> {
  const res = await fetch(LOVABLE_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: options.model || "google/gemini-3.1-flash-image-preview",
      messages: [{ role: "user", content: options.prompt }],
      modalities: ["image", "text"],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    return { imageData: null, error: `Gateway ${res.status}: ${errText}`, status: res.status };
  }

  const data = await res.json();
  const images = data.choices?.[0]?.message?.images;
  if (!images || images.length === 0) {
    return { imageData: null, error: "No image in gateway response" };
  }

  return { imageData: images[0].image_url.url };
}

async function generateImageViaNative(options: AIImageOptions): Promise<AIImageResult> {
  const apiKey = getApiKey();
  const model = mapModel(options.model);

  const res = await fetch(
    `${GEMINI_NATIVE_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    return { imageData: null, error: `Gemini ${res.status}: ${errText}`, status: res.status };
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: any) => p.inlineData);

  if (!imagePart) {
    return { imageData: null, error: "No image in Gemini response" };
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  const base64 = imagePart.inlineData.data;
  return { imageData: `data:${mimeType};base64,${base64}` };
}
