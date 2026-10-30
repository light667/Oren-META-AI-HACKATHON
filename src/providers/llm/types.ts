/**
 * Interface unique du fournisseur de modèles (LlmProvider).
 * Tout le reste du code ne dépend que de ce fichier : aucun appel
 * direct à la Meta Model API hors de src/providers/llm/meta.ts.
 */

export type ChatRole = "system" | "developer" | "user" | "assistant" | "tool";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; url: string }; // URL publique ou data: URL (base64)

export interface ChatMessage {
  role: ChatRole;
  /** Texte simple, ou parties multimodales (texte + images, rôle user). */
  content: string | ContentPart[];
  /** Pour role="tool" : identifiant de l'appel d'outil auquel on répond. */
  toolCallId?: string;
  /** Pour role="assistant" : appels d'outils émis par le modèle (rejouer l'historique). */
  toolCalls?: ToolCall[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  /** Schéma JSON des paramètres (type object). */
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  /** Arguments JSON bruts tels que renvoyés par le modèle (chaîne). */
  arguments: string;
}

export type ResponseFormat =
  | { type: "json_object" }
  | {
      type: "json_schema";
      name: string;
      schema: Record<string, unknown>;
      strict?: boolean;
    };

export interface ChatOptions {
  tools?: ToolDefinition[];
  toolChoice?: "auto" | "none" | { name: string };
  responseFormat?: ResponseFormat;
  temperature?: number;
  maxTokens?: number;
  /** Surcharge ponctuelle du modèle (défaut : META_CHAT_MODEL). */
  model?: string;
}

export interface ChatResult {
  content: string | null;
  toolCalls: ToolCall[];
  finishReason: string | null;
  model: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  /** Réponse brute du fournisseur, pour le journal d'audit. */
  raw: unknown;
}

export interface TranscribeInput {
  data: Uint8Array;
  filename: string;
  mimeType?: string;
  mode?: "PUSH_TO_TALK" | "ENDPOINTING" | "DIARIZATION";
  languageBias?: string[];
  keywords?: string[];
  model?: string;
}

export interface TranscriptionTurn {
  turnId?: number;
  startMs?: number;
  endMs?: number;
  transcript: string;
  speaker?: string;
}

export interface TranscribeResult {
  text: string;
  turns: TranscriptionTurn[];
  audioDurationMs?: number;
  model: string;
  raw: unknown;
}

export interface LlmProvider {
  readonly name: string;
  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult>;
  transcribe(audio: TranscribeInput): Promise<TranscribeResult>;
}

export class LlmProviderError extends Error {
  readonly status?: number;
  readonly code?: string;
  readonly raw?: unknown;

  constructor(
    message: string,
    opts?: { status?: number; code?: string; raw?: unknown },
  ) {
    super(message);
    this.name = "LlmProviderError";
    this.status = opts?.status;
    this.code = opts?.code;
    this.raw = opts?.raw;
  }
}
