/**
 * Chaîne de repli entre fournisseurs LLM.
 * Ordre par défaut : Meta (principal, requis hackathon) → Mistral →
 * Gemini. Si un fournisseur échoue (clé absente/épuisée, quota 402/429,
 * 401, 5xx, réseau) ou n'est pas adapté à la tâche (ex. Meta refuse
 * un audio non-WAV, ou un tool_choice forcé), le suivant prend le
 * relais pour le même appel. Échec seulement si tous échouent.
 * Ordre réglable : LLM_PROVIDER_ORDER=meta,mistral,gemini
 */
import {
  LlmProviderError,
  type ChatMessage,
  type ChatOptions,
  type ChatResult,
  type LlmProvider,
  type TranscribeInput,
  type TranscribeResult,
} from "./types";

export class FallbackLlmProvider implements LlmProvider {
  readonly name: string;
  readonly providers: LlmProvider[];

  constructor(providers: LlmProvider[]) {
    if (!providers.length) {
      throw new LlmProviderError("Aucun fournisseur LLM configuré.", {
        code: "MISSING_API_KEY",
      });
    }
    this.providers = providers;
    this.name = `fallback:${providers.map((p) => p.name).join(">")}`;
  }

  private async tryAll<T>(label: string, run: (p: LlmProvider) => Promise<T>): Promise<T> {
    const failures: string[] = [];
    for (const provider of this.providers) {
      try {
        return await run(provider);
      } catch (error) {
        const detail =
          error instanceof LlmProviderError
            ? `${provider.name}: ${error.message}${error.status ? ` (HTTP ${error.status})` : ""}${error.code ? ` [${error.code}]` : ""}`
            : `${provider.name}: ${error instanceof Error ? error.message : String(error)}`;
        failures.push(detail);
      }
    }
    throw new LlmProviderError(
      `Tous les fournisseurs LLM ont échoué pour ${label} — ${failures.join(" ; ")}`,
      { code: "ALL_PROVIDERS_FAILED" },
    );
  }

  chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    return this.tryAll("chat", (p) => p.chat(messages, options));
  }

  transcribe(audio: TranscribeInput): Promise<TranscribeResult> {
    return this.tryAll("transcribe", (p) => p.transcribe(audio));
  }
}
