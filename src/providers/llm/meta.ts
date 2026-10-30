/**
 * Implémentation Meta Model API (https://dev.meta.ai/docs).
 *
 * Faits vérifiés dans la documentation officielle le 2026-10-30 :
 * - Base URL : https://api.meta.ai/v1, auth Bearer avec MODEL_API_KEY.
 * - Chat : POST /v1/chat/completions (format OpenAI). Modèle par défaut
 *   muse-spark-1.3 (1 048 576 tokens de contexte).
 * - Outils (Chat Completions) : tools[].type="function", champs imbriqués
 *   sous tools[].function {name, description, parameters}. Réponse :
 *   choices[0].message.tool_calls[].function {name, arguments}.
 * - Sortie structurée : response_format {type:"json_schema", json_schema:
 *   {name, schema, strict?}}. Le JSON arrive en chaîne dans
 *   choices[0].message.content.
 * - Images (Chat Completions, rôle user uniquement) : content[] avec
 *   {type:"image_url", image_url:{url}} où url est publique ou data: base64.
 *   Max 50 images/requête, 50 Mo/image en inline, MIME jpeg/png/gif/webp.
 * - Transcription : POST /v1/asr/transcribe (multipart : parties
 *   "request" JSON + "audio"), modèle muse-voice-transcribe-1.0.
 *   Audio accepté : WAV RIFF mono PCM 16 bits à 16 kHz ou 24 kHz,
 *   32 Mo max, 10 minutes max. Le M4A doit être converti avant envoi.
 */
import {
  LlmProviderError,
  type ChatMessage,
  type ChatOptions,
  type ChatResult,
  type ContentPart,
  type LlmProvider,
  type ToolCall,
  type TranscribeInput,
  type TranscribeResult,
} from "./types";

const DEFAULT_BASE_URL = "https://api.meta.ai/v1";
const DEFAULT_CHAT_MODEL = "muse-spark-1.3";
const DEFAULT_TRANSCRIBE_MODEL = "muse-voice-transcribe-1.0";

export interface MetaLlmConfig {
  apiKey?: string;
  baseUrl?: string;
  chatModel?: string;
  transcribeModel?: string;
  /** Injectable pour les tests. Défaut : fetch global. */
  fetchFn?: typeof fetch;
}

function envFirst(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name]?.trim();
    if (value) return value;
  }
  return undefined;
}

export function resolveMetaConfig(config: MetaLlmConfig = {}): Required<
  Omit<MetaLlmConfig, "fetchFn">
> & { fetchFn: typeof fetch } {
  return {
    // Nom canonique documenté par Meta : MODEL_API_KEY (META_API_KEY en repli).
    apiKey:
      config.apiKey ??
      envFirst("MODEL_API_KEY", "META_API_KEY") ??
      "",
    baseUrl: (
      config.baseUrl ??
      process.env.META_MODEL_API_BASE_URL ??
      DEFAULT_BASE_URL
    ).replace(/\/$/, ""),
    chatModel: config.chatModel ?? process.env.META_CHAT_MODEL ?? DEFAULT_CHAT_MODEL,
    transcribeModel:
      config.transcribeModel ??
      process.env.META_TRANSCRIBE_MODEL ??
      DEFAULT_TRANSCRIBE_MODEL,
    fetchFn: config.fetchFn ?? fetch,
  };
}

function toApiContent(content: ChatMessage["content"]): unknown {
  if (typeof content === "string") return content;
  return content.map((part: ContentPart) => {
    if (part.type === "text") return { type: "text", text: part.text };
    return { type: "image_url", image_url: { url: part.url } };
  });
}

function toApiMessage(message: ChatMessage): Record<string, unknown> {
  const api: Record<string, unknown> = {
    role: message.role,
    content: toApiContent(message.content),
  };
  if (message.toolCallId) api.tool_call_id = message.toolCallId;
  if (message.toolCalls?.length) {
    api.tool_calls = message.toolCalls.map((call) => ({
      id: call.id,
      type: "function",
      function: { name: call.name, arguments: call.arguments },
    }));
  }
  return api;
}

function parseToolCalls(raw: unknown): ToolCall[] {
  if (!Array.isArray(raw)) return [];
  const calls: ToolCall[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    const fn = (entry.function ?? {}) as Record<string, unknown>;
    const name = typeof fn.name === "string" ? fn.name : "";
    if (!name) continue;
    calls.push({
      id: typeof entry.id === "string" ? entry.id : "",
      name,
      arguments:
        typeof fn.arguments === "string"
          ? fn.arguments
          : JSON.stringify(fn.arguments ?? {}),
    });
  }
  return calls;
}

function isWav(data: Uint8Array): boolean {
  return (
    data.length >= 12 &&
    String.fromCharCode(...data.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...data.slice(8, 12)) === "WAVE"
  );
}

export class MetaLlmProvider implements LlmProvider {
  readonly name = "meta-model-api";
  private readonly config: ReturnType<typeof resolveMetaConfig>;

  constructor(config: MetaLlmConfig = {}) {
    this.config = resolveMetaConfig(config);
  }

  private requireKey(): string {
    if (!this.config.apiKey) {
      throw new LlmProviderError(
        "Clé API absente : définissez MODEL_API_KEY (dashboard dev.meta.ai > API keys).",
        { code: "MISSING_API_KEY" },
      );
    }
    return this.config.apiKey;
  }

  private async readError(response: Response): Promise<LlmProviderError> {
    let raw: unknown = null;
    let message = `HTTP ${response.status}`;
    try {
      raw = await response.json();
      const err = (raw as { error?: { message?: string; code?: string } }).error;
      if (err?.message) message = err.message;
      return new LlmProviderError(message, {
        status: response.status,
        code: err?.code,
        raw,
      });
    } catch {
      return new LlmProviderError(message, { status: response.status, raw });
    }
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResult> {
    const apiKey = this.requireKey();
    const model = options.model ?? this.config.chatModel;
    const body: Record<string, unknown> = {
      model,
      messages: messages.map(toApiMessage),
    };
    if (options.tools?.length) {
      body.tools = options.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
    }
    if (options.toolChoice) {
      // Vérifié en réel le 2026-10-30 : seul "auto" est accepté, tout autre
      // choix (nommé, "none", "required") renvoie HTTP 400. On refuse ici
      // avec un message clair plutôt que d'envoyer un appel voué à l'échec.
      if (options.toolChoice !== "auto") {
        throw new LlmProviderError(
          'tool_choice forcé non supporté par la Meta Model API : seul "auto" est accepté.',
          { code: "TOOL_CHOICE_UNSUPPORTED" },
        );
      }
      body.tool_choice = "auto";
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
    if (options.maxTokens !== undefined) body.max_completion_tokens = options.maxTokens;

    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/chat/completions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) throw await this.readError(response);

    const raw = (await response.json()) as Record<string, unknown>;
    const choices = Array.isArray(raw.choices) ? raw.choices : [];
    const first = (choices[0] ?? {}) as Record<string, unknown>;
    const message = (first.message ?? {}) as Record<string, unknown>;
    const usage = (raw.usage ?? {}) as Record<string, unknown>;
    return {
      content: typeof message.content === "string" ? message.content : null,
      toolCalls: parseToolCalls(message.tool_calls),
      finishReason:
        typeof first.finish_reason === "string" ? first.finish_reason : null,
      model: typeof raw.model === "string" ? raw.model : model,
      usage: {
        promptTokens:
          typeof usage.prompt_tokens === "number" ? usage.prompt_tokens : undefined,
        completionTokens:
          typeof usage.completion_tokens === "number"
            ? usage.completion_tokens
            : undefined,
        totalTokens:
          typeof usage.total_tokens === "number" ? usage.total_tokens : undefined,
      },
      raw,
    };
  }

  async transcribe(audio: TranscribeInput): Promise<TranscribeResult> {
    const apiKey = this.requireKey();
    // L'endpoint fichier n'accepte que du WAV PCM mono 16 bits (16/24 kHz).
    // On refuse les autres formats ici plutôt que d'envoyer un appel voué au 400.
    if (!isWav(audio.data)) {
      throw new LlmProviderError(
        `Format audio non accepté par /v1/asr/transcribe : « ${audio.filename} » n'est pas un WAV PCM. ` +
          "Convertissez d'abord : ffmpeg -i entree.m4a -ac 1 -ar 24000 -c:a pcm_s16le -map_metadata -1 sortie.wav",
        { code: "UNSUPPORTED_AUDIO_FORMAT" },
      );
    }
    const model = audio.model ?? this.config.transcribeModel;
    const request = {
      mode: audio.mode ?? "PUSH_TO_TALK",
      model,
      audioEncoding: "WAV",
      ...(audio.languageBias?.length ? { languageBias: audio.languageBias } : {}),
      ...(audio.keywords?.length ? { keywords: audio.keywords } : {}),
    };
    const form = new FormData();
    form.append(
      "request",
      new Blob([JSON.stringify(request)], { type: "application/json" }),
    );
    form.append(
      "audio",
      new Blob([audio.data as BlobPart], { type: audio.mimeType ?? "audio/wav" }),
      audio.filename,
    );

    const response = await this.config.fetchFn(
      `${this.config.baseUrl}/asr/transcribe`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      },
    );
    if (!response.ok) throw await this.readError(response);

    const raw = (await response.json()) as Record<string, unknown>;
    const turnsRaw = Array.isArray(raw.turns) ? raw.turns : [];
    return {
      text: typeof raw.transcript === "string" ? raw.transcript : "",
      turns: turnsRaw.map((turn) => {
        const t = turn as Record<string, unknown>;
        return {
          turnId: typeof t.turnId === "number" ? t.turnId : undefined,
          startMs: typeof t.startMs === "number" ? t.startMs : undefined,
          endMs: typeof t.endMs === "number" ? t.endMs : undefined,
          transcript: typeof t.transcript === "string" ? t.transcript : "",
          speaker: typeof t.speaker === "string" ? t.speaker : undefined,
        };
      }),
      audioDurationMs:
        typeof raw.audioDurationMs === "number" ? raw.audioDurationMs : undefined,
      model,
      raw,
    };
  }
}
