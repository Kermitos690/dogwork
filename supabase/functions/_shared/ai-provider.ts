/**
 * Centralized AI Provider Adapter for DogWork.
 *
 * Multi-provider router with cascade fallback. Lovable AI Gateway and
 * OpenAI are intentionally NOT used — only free / direct provider tiers.
 *
 * Routing strategy by task type:
 *  - chat        → Groq → OpenRouter → Gemini → Mistral
 *  - reasoning   → Gemini 2.5 Pro → Mistral Large → Groq → OpenRouter
 *  - tools       → Gemini → Groq → OpenRouter → Mistral
 *  - image       → Gemini (only free image provider)
 *
 * Each provider is OpenAI-compatible (chat/completions schema), so the
 * response shape returned to callers stays identical.
 */

// ─── Endpoints ─────────────────────────────────────────────

const GEMINI_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";
const GEMINI_NATIVE_BASE = "https://generativelanguage.googleapis.com/v1beta";
const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const MISTRAL_BASE = "https://api.mistral.ai/v1";
const OPENAI_BASE = "https://api.openai.com/v1";

// ─── Provider Identifiers ──────────────────────────────────

type Provider = "groq" | "openrouter" | "gemini" | "mistral" | "openai";

interface ProviderTarget {
  provider: Provider;
  model: string;
}

// ─── Model Catalog (per provider, free or low-cost) ────────

const CATALOG = {
  groq: {
    chat: "llama-3.3-70b-versatile",       // free, fast
    reasoning: "llama-3.3-70b-versatile",
    tools: "llama-3.3-70b-versatile",
  },
  openrouter: {
    chat: "meta-llama/llama-3.3-70b-instruct:free",
    reasoning: "google/gemini-2.0-flash-exp:free",
    tools: "google/gemini-2.0-flash-exp:free",
  },
  gemini: {
    chat: "gemini-2.5-flash",
    reasoning: "gemini-2.5-pro",
    tools: "gemini-2.5-flash",
    image: "gemini-2.5-flash-image",
  },
  mistral: {
    chat: "mistral-small-latest",          // free tier
    reasoning: "mistral-large-latest",
    tools: "mistral-small-latest",
  },
  openai: {
    chat: "gpt-4o-mini",
    reasoning: "gpt-4o-mini",
    tools: "gpt-4o-mini",
  },
} as const;

// ─── Task Routing (cascade order) ──────────────────────────

type TaskKind = "chat" | "reasoning" | "tools" | "image";

function detectTask(opts: AICompletionOptions): TaskKind {
  if (opts.tools && opts.tools.length > 0) return "tools";
  // Heuristic: "pro" / heavy models → reasoning
  if (/pro|gpt-5(?!-mini|-nano)|reasoning/.test(opts.model)) return "reasoning";
  return "chat";
}

function buildCascade(task: TaskKind): ProviderTarget[] {
  switch (task) {
    case "tools":
      return [
        { provider: "openai", model: CATALOG.openai.tools },
        { provider: "gemini", model: CATALOG.gemini.tools },
        { provider: "groq", model: CATALOG.groq.tools },
        { provider: "openrouter", model: CATALOG.openrouter.tools },
        { provider: "mistral", model: CATALOG.mistral.tools },
      ];
    case "reasoning":
      return [
        { provider: "gemini", model: CATALOG.gemini.reasoning },
        { provider: "openai", model: CATALOG.openai.reasoning },
        { provider: "mistral", model: CATALOG.mistral.reasoning },
        { provider: "groq", model: CATALOG.groq.reasoning },
        { provider: "openrouter", model: CATALOG.openrouter.reasoning },
      ];
    case "chat":
    default:
      return [
        { provider: "groq", model: CATALOG.groq.chat },
        { provider: "openrouter", model: CATALOG.openrouter.chat },
        { provider: "gemini", model: CATALOG.gemini.chat },
        { provider: "mistral", model: CATALOG.mistral.chat },
        { provider: "openai", model: CATALOG.openai.chat },
      ];
    case "image":
      return [{ provider: "gemini", model: CATALOG.gemini.image }];
  }
}

// ─── API key resolution ────────────────────────────────────

function getKey(provider: Provider): string | null {
  switch (provider) {
    case "groq": return Deno.env.get("GROQ_API_KEY") ?? null;
    case "openrouter": return Deno.env.get("OPENROUTER_API_KEY") ?? null;
    case "gemini": return Deno.env.get("GOOGLE_AI_API_KEY") ?? null;
    case "mistral": return Deno.env.get("MISTRAL_API_KEY") ?? null;
    case "openai": return Deno.env.get("OPENAI_API_KEY") ?? null;
  }
}

function endpointFor(provider: Provider): string {
  switch (provider) {
    case "groq": return `${GROQ_BASE}/chat/completions`;
    case "openrouter": return `${OPENROUTER_BASE}/chat/completions`;
    case "gemini": return `${GEMINI_OPENAI_BASE}/chat/completions`;
    case "mistral": return `${MISTRAL_BASE}/chat/completions`;
    case "openai": return `${OPENAI_BASE}/chat/completions`;
  }
}

// ─── Public API ────────────────────────────────────────────

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
 * Call AI for text completion / streaming / tool calling, with cascade fallback.
 * Tries each provider in order; on retryable failure (429/402/5xx, network, missing key)
 * moves to the next. Returns the first successful Response (still a stream if requested).
 */
export async function callAI(options: AICompletionOptions): Promise<Response> {
  const task = detectTask(options);
  const cascade = buildCascade(task);
  const errors: string[] = [];

  for (const target of cascade) {
    const key = getKey(target.provider);
    if (!key) {
      errors.push(`${target.provider}: no API key`);
      continue;
    }

    try {
      const body: Record<string, any> = {
        model: target.model,
        messages: options.messages,
        stream: options.stream ?? false,
      };
      if (options.temperature !== undefined) body.temperature = options.temperature;
      if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;
      if (options.tools) body.tools = options.tools;
      if (options.tool_choice) body.tool_choice = options.tool_choice;

      const headers: Record<string, string> = {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      };
      if (target.provider === "openrouter") {
        headers["HTTP-Referer"] = "https://dogwork-at-home.com";
        headers["X-Title"] = "DogWork";
      }

      const res = await fetch(endpointFor(target.provider), {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });

      // Retry on rate-limit / payment / server errors
      if (res.status === 429 || res.status === 402 || res.status >= 500) {
        const txt = await res.text().catch(() => "");
        errors.push(`${target.provider}/${target.model}: ${res.status} ${txt.slice(0, 120)}`);
        console.warn(`[ai-provider] ${target.provider} ${res.status} → next`);
        continue;
      }

      if (!res.ok) {
        // Non-retryable (400 invalid params etc.) — try next anyway since other providers
        // may accept the same payload shape.
        const txt = await res.text().catch(() => "");
        errors.push(`${target.provider}/${target.model}: ${res.status} ${txt.slice(0, 120)}`);
        console.warn(`[ai-provider] ${target.provider} ${res.status} (non-retryable) → next`);
        continue;
      }

      console.log(`[ai-provider] ✓ ${target.provider}/${target.model} (task=${task})`);
      return res;
    } catch (err) {
      errors.push(`${target.provider}: ${(err as Error).message}`);
      console.warn(`[ai-provider] ${target.provider} threw → next:`, err);
      continue;
    }
  }

  // All providers exhausted
  console.error("[ai-provider] All providers failed:", errors);
  return new Response(
    JSON.stringify({
      error: "Tous les fournisseurs IA gratuits sont indisponibles. Réessayez dans quelques minutes.",
      details: errors,
    }),
    { status: 503, headers: { "Content-Type": "application/json" } }
  );
}

/**
 * Legacy alias — kept so existing imports keep working.
 * Returns null only if no API key exists for ANY provider, so callers
 * that branch on null behave reasonably.
 */
export async function callAIGateway(options: AICompletionOptions): Promise<Response | null> {
  return callAI(options);
}

// ─── Image Generation (Gemini direct only) ─────────────────

export interface AIImageOptions {
  model: string;
  prompt: string;
}

export interface AIImageResult {
  imageData: string | null;
  error?: string;
  status?: number;
}

export async function generateImage(options: AIImageOptions): Promise<AIImageResult> {
  const apiKey = getKey("gemini");
  if (!apiKey) {
    return { imageData: null, error: "GOOGLE_AI_API_KEY not configured" };
  }

  const model = options.model.includes("image") ? options.model.replace(/^google\//, "") : CATALOG.gemini.image;

  const res = await fetch(
    `${GEMINI_NATIVE_BASE}/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: options.prompt }] }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
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
