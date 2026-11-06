/**
 * Fournisseur Mistral AI (repli du Meta Model API).
 * - Chat : POST https://api.mistral.ai/v1/chat/completions (format
 *   OpenAI : outils sous function, response_format json_schema).
 * - Transcription : POST /v1/audio/transcriptions (Voxtral, multipart),
 *   accepte wav/mp3/m4a/ogg/flac — là où Meta n'accepte que le WAV.
 * Clé : MISTRAL_API_KEY (jamais dans le code).
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

const DEFAULT_BASE_URL = "https://api.mistral.ai/v1";
// Vérifié en réel : sur le palier de la clé actuelle, Large renvoie 403
// et Small/Medium 429 ; ministral-8b (outils + vision) répond. Surcharge
// possible par MISTRAL_CHAT_MODEL (ex. mistral-large-latest en payant).
const DEFAULT_CHAT_MODEL = "ministral-8b-latest";
const DEFAULT_TRANSCRIBE_MODEL = "voxtral-mini-latest";

export interface MistralLlmConfig {
  apiKey?: string;
  baseUrl?: string;
  chatModel?: string;
  transcribeModel?: string;
  fetchFn?: typeof fetch;
}

export function resolveMistralConfig(config: MistralLlmConfig = {}) {
  return {
    apiKey: config.apiKey ?? process.env.MISTRAL_API_KEY?.trim() ?? "",
    baseUrl: (config.baseUrl ?? process.env.MISTRAL_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, ""),
    chatModel: config.chatModel ?? process.env.MISTRAL_CHAT_MODEL ?? DEFAULT_CHAT_MODEL,
    transcribeModel:
      config.transcribeModel ?? process.env.MISTRAL_TRANSCRIBE_MODEL ?? DEFAULT_TRANSCRIBE_MODEL,
    fetchFn: config.fetchFn ?? defaultLlmFetch(),
  };
}

/**
 * Mistral exige des identifiants d'appel d'outil de 9 caractères
 * alphanumériques. Quand Mistral reprend un tour commencé par Meta
 * (relais en cours de conversation), les identifiants Meta sont
 * convertis de façon déterministe : l'appel et sa réponse « tool »
 * gardent le même identifiant converti.
 */
export function toMistralToolId(id: string): string {
  if (/^[a-zA-Z0-9]{9}$/.test(id)) return id;
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < id.length; i++) {
    const c = id.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x85ebca6b) >>> 0;
  }
  return (h1.toString(36) + h2.toString(36) + "000000000").slice(0, 9);
}

function parseToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: ToolCall[] = [];
  for (const item of raw) {
    const entry = (item ?? {}) as Record<string, unknown>;
    const fn = (entry.function ?? {}) as Record<string, unknown>;
    if (typeof fn.name !== "string" || !fn.name) continue;
    calls.push({
      id: typeof entry.id === "string" ? entry.id : "",
      name: fn.name,
      arguments:
        typeof fn.arguments === "string" ? fn.arguments : JSON.stringify(fn.arguments ?? {}),
    });
  }
  return calls;
}

export class MistralLlmProvider implements LlmProvider {
  readonly name = "mistral";
  private readonly config: ReturnType<typeof resolveMistralConfig>;

  constructor(config: MistralLlmConfig = {}) {
    this.config = resolveMistralConfig(config);
  }

  private requireKey(): string {
    if (!this.config.apiKey) {
      throw new LlmProviderError("Clé API absente : définissez MISTRAL_API_KEY.", {
        code: "MISSING_API_KEY",
      });
    }
    return this.config.apiKey;
  }

  private async readError(response: Response): Promise<LlmProviderError> {
    let raw: unknown = null;
    let message = `HTTP ${response.status}`;
    try {
      raw = await response.json();
      const flat = raw as { message?: string; code?: string };
      if (flat?.message) {
        return new LlmProviderError(flat.message, {
          status: response.status,
          code: flat.code,
          raw,
        });
      }
      const err = (raw as { error?: { message?: string; code?: string } | string }).error;
      let code: string | undefined;
      if (typeof err === "string") message = err;
      else if (err?.message) {
        message = err.message;
        code = err.code;
      }
      return new LlmProviderError(message, { status: response.status, code, raw });
    } catch {
      return new LlmProviderError(message, { status: response.status, raw });
    }
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const apiKey = this.requireKey();
    const model = options.model ?? this.config.chatModel;
    const body: Record<string, unknown> = {
      model,
      messages: messages.map((m) => ({
        role: m.role,
        content:
          typeof m.content === "string"
            ? m.content
            : m.content.map((p) =>
                p.type === "text"
                  ? { type: "text", text: p.text }
                  : { type: "image_url", image_url: { url: p.url } },
              ),
        ...(m.toolCallId ? { tool_call_id: toMistralToolId(m.toolCallId) } : {}),
        ...(m.toolCalls?.length
          ? {
              tool_calls: m.toolCalls.map((c) => ({
                id: toMistralToolId(c.id),
                type: "function",
                function: { name: c.name, arguments: c.arguments },
              })),
            }
          : {}),
      })),
    };
    if (options.tools?.length) {
      body.tools = options.tools.map((t) => ({
        type: "function",
        function: { name: t.name, description: t.description, parameters: t.parameters },
      }));
    }
    if (options.toolChoice === "auto") body.tool_choice = "auto";
    else if (options.toolChoice === "none") body.tool_choice = "none";
    else if (options.toolChoice) {
      body.tool_choice = { type: "function", function: { name: options.toolChoice.name } };
    }
    if (options.responseFormat) {
      body.response_format =
        options.responseFormat.type === "json_object"
          ? { type: "json_object" }
          : {
              type: "json_schema",
              json_schema: {
                name: options.responseFormat.name,
                schema: options.responseFormat.schema,
                ...(options.responseFormat.strict !== undefined
                  ? { strict: options.responseFormat.strict }
                  : {}),
              },
            };
    }
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;

    const response = await this.config.fetchFn(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw await this.readError(response);

    const raw = (await response.json()) as Record<string, unknown>;
    const first = ((Array.isArray(raw.choices) ? raw.choices[0] : {}) ?? {}) as Record<string, unknown>;
    const message = (first.message ?? {}) as Record<string, unknown>;
    const usage = (raw.usage ?? {}) as Record<string, unknown>;
    return {
      content: typeof message.content === "string" ? message.content : null,
      toolCalls: parseToolCalls(message.tool_calls),
      finishReason: typeof first.finish_reason === "string" ? first.finish_reason : null,
      model: typeof raw.model === "string" ? raw.model : model,
      usage: {
        promptTokens: typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
        completionTokens:
          typeof usage.completion_tokens === "number" ? usage.completion_tokens : undefined,
        totalTokens: typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
      },
      raw,
    };
  }

  async transcribe(audio: TranscribeInput): Promise<TranscribeResult> {
    const apiKey = this.requireKey();
    const model = audio.model ?? this.config.transcribeModel;
    const form = new FormData();
    form.append("model", model);
    form.append(
      "file",
      new Blob([audio.data as BlobPart], { type: audio.mimeType ?? "audio/wav" }),
      audio.filename,
    );
    const response = await this.config.fetchFn(`${this.config.baseUrl}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
    });
    if (!response.ok) throw await this.readError(response);
    const raw = (await response.json()) as Record<string, unknown>;
    return {
      text: typeof raw.text === "string" ? raw.text : "",
      turns: [],
      model: typeof raw.model === "string" ? raw.model : model,
      raw,
    };
  }
}
