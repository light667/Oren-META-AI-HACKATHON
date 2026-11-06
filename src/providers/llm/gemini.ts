/**
 * Fournisseur Google Gemini (second repli).
 * POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent
 * Auth : en-tête x-goog-api-key (GEMINI_API_KEY, jamais dans le code).
 * Chat + outils (functionDeclarations), vision (inlineData/fileData),
 * sortie JSON, et transcription audio via contenu multimodal.
 */
import { defaultLlmFetch } from "./http";
import {
  LlmProviderError,
  type ChatMessage,
  type ChatOptions,
  type ChatResult,
  type LlmProvider,
  type ToolCall,
  type TranscribeInput,
  type TranscribeResult,
} from "./types";

const DEFAULT_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-2.5-flash";

export interface GeminiLlmConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  fetchFn?: typeof fetch;
}

export function resolveGeminiConfig(config: GeminiLlmConfig = {}) {
  return {
    apiKey:
      config.apiKey ??
      process.env.GEMINI_API_KEY?.trim() ??
      process.env.GOOGLE_GEMINI_API_KEY?.trim() ??
      "",
    baseUrl: (config.baseUrl ?? process.env.GEMINI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    model: config.model ?? process.env.GEMINI_MODEL ?? DEFAULT_MODEL,
    fetchFn: config.fetchFn ?? defaultLlmFetch(),
  };
}

type Part = Record<string, unknown>;

function imagePart(url: string): Part {
  const data = /^data:([^;,]+);base64,([\s\S]+)$/.exec(url);
  if (data) return { inlineData: { mimeType: data[1], data: data[2] } };
  return { fileData: { fileUri: url } };
}

function toContents(messages: ChatMessage[]) {
  const systemTexts: string[] = [];
  const toolNames = new Map<string, string>();
  for (const m of messages) {
    for (const c of m.toolCalls ?? []) toolNames.set(c.id, c.name);
  }
  const contents: { role: string; parts: Part[] }[] = [];
  for (const m of messages) {
    const text = typeof m.content === "string" ? m.content : null;
    if (m.role === "system" || m.role === "developer") {
      if (text) systemTexts.push(text);
      continue;
    }
    if (m.role === "tool") {
      let response: unknown = text ?? "";
      try {
        response = JSON.parse(text ?? "");
      } catch {
        response = { result: text ?? "" };
      }
      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: toolNames.get(m.toolCallId ?? "") ?? "outil",
              response:
                response && typeof response === "object"
                  ? response
                  : { result: response },
            },
          },
        ],
      });
      continue;
    }
    const parts: Part[] = [];
    if (typeof m.content === "string") {
      if (m.content) parts.push({ text: m.content });
    } else {
      for (const p of m.content) {
        parts.push(p.type === "text" ? { text: p.text } : imagePart(p.url));
      }
    }
    for (const c of m.toolCalls ?? []) {
      let args: unknown = {};
      try {
        args = JSON.parse(c.arguments);
      } catch {
        args = {};
      }
      parts.push({ functionCall: { name: c.name, args } });
    }
    contents.push({ role: m.role === "assistant" ? "model" : "user", parts });
  }
  return { systemTexts, contents };
}

export class GeminiLlmProvider implements LlmProvider {
  readonly name = "gemini";
  private readonly config: ReturnType<typeof resolveGeminiConfig>;

  constructor(config: GeminiLlmConfig = {}) {
    this.config = resolveGeminiConfig(config);
  }

  private requireKey(): string {
    if (!this.config.apiKey) {
      throw new LlmProviderError("Clé API absente : définissez GEMINI_API_KEY.", {
        code: "MISSING_API_KEY",
      });
    }
    return this.config.apiKey;
  }

  private async generate(body: Record<string, unknown>, model: string): Promise<Record<string, unknown>> {
    const apiKey = this.requireKey();
    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    let raw: unknown = null;
    try {
      raw = await response.json();
    } catch {
      raw = null;
    }
    if (!response.ok) {
      const err = (raw as { error?: { message?: string; status?: string } } | null)?.error;
      throw new LlmProviderError(err?.message ?? `HTTP ${response.status}`, {
        status: response.status,
        code: err?.status,
        raw,
      });
    }
    return (raw ?? {}) as Record<string, unknown>;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const model = options.model ?? this.config.model;
    const { systemTexts, contents } = toContents(messages);
    const body: Record<string, unknown> = { contents };
    if (systemTexts.length) {
      body.systemInstruction = { parts: systemTexts.map((text) => ({ text })) };
    }
    if (options.tools?.length) {
      body.tools = [
        {
          functionDeclarations: options.tools.map((t) => ({
            name: t.name,
            description: t.description,
            // `parameters` n'accepte qu'un sous-ensemble OpenAPI et rejette
            // `additionalProperties` (produit par Zod) : HTTP 400 vérifié en
            // réel. `parametersJsonSchema` accepte le JSON Schema complet,
            // comme `responseJsonSchema` plus bas.
            parametersJsonSchema: t.parameters,
          })),
        },
      ];
    }
    if (options.toolChoice) {
      body.toolConfig = {
        functionCallingConfig:
          options.toolChoice === "auto"
            ? { mode: "AUTO" }
            : options.toolChoice === "none"
              ? { mode: "NONE" }
              : { mode: "ANY", allowedFunctionNames: [options.toolChoice.name] },
      };
    }
    const generationConfig: Record<string, unknown> = {};
    if (options.temperature !== undefined) generationConfig.temperature = options.temperature;
    if (options.maxTokens !== undefined) generationConfig.maxOutputTokens = options.maxTokens;
    if (options.responseFormat) {
      generationConfig.responseMimeType = "application/json";
      if (options.responseFormat.type === "json_schema") {
        generationConfig.responseJsonSchema = options.responseFormat.schema;
      }
    }
    if (Object.keys(generationConfig).length) body.generationConfig = generationConfig;

    const raw = await this.generate(body, model);
    const candidate = ((Array.isArray(raw.candidates) ? raw.candidates[0] : {}) ?? {}) as Record<string, unknown>;
    const parts = ((candidate.content as Record<string, unknown> | undefined)?.parts ?? []) as Part[];
    const toolCalls: ToolCall[] = [];
    const texts: string[] = [];
    parts.forEach((part, i) => {
      if (typeof part.text === "string") texts.push(part.text);
      const fc = part.functionCall as { name?: string; args?: unknown } | undefined;
      if (fc?.name) {
        toolCalls.push({
          id: `gemini-${fc.name}-${i}`,
          name: fc.name,
          arguments: JSON.stringify(fc.args ?? {}),
        });
      }
    });
    const usage = (raw.usageMetadata ?? {}) as Record<string, unknown>;
    return {
      content: texts.length ? texts.join("") : null,
      toolCalls,
      finishReason: typeof candidate.finishReason === "string" ? candidate.finishReason : null,
      model,
      usage: {
        promptTokens: typeof usage.promptTokenCount === "number" ? usage.promptTokenCount : undefined,
        completionTokens:
          typeof usage.candidatesTokenCount === "number" ? usage.candidatesTokenCount : undefined,
        totalTokens: typeof usage.totalTokenCount === "number" ? usage.totalTokenCount : undefined,
      },
      raw,
    };
  }

  async transcribe(audio: TranscribeInput): Promise<TranscribeResult> {
    const model = audio.model ?? this.config.model;
    const mimeType =
      audio.mimeType ??
      (audio.filename.toLowerCase().endsWith(".mp3")
        ? "audio/mp3"
        : audio.filename.toLowerCase().endsWith(".m4a")
          ? "audio/mp4"
          : "audio/wav");
    const raw = await this.generate(
      {
        contents: [
          {
            role: "user",
            parts: [
              { text: "Transcris fidèlement cet audio, en français si l'audio est en français. Réponds uniquement par la transcription, sans commentaire." },
              {
                inlineData: {
                  mimeType,
                  data: Buffer.from(audio.data).toString("base64"),
                },
              },
            ],
          },
        ],
      },
      model,
    );
    const candidate = ((Array.isArray(raw.candidates) ? raw.candidates[0] : {}) ?? {}) as Record<string, unknown>;
    const parts = ((candidate.content as Record<string, unknown> | undefined)?.parts ?? []) as Part[];
    const text = parts.map((p) => (typeof p.text === "string" ? p.text : "")).join("").trim();
    return { text, turns: [], model, raw };
  }
}
