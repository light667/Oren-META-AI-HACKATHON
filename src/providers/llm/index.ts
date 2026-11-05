export * from "./types";
export { MetaLlmProvider, resolveMetaConfig, type MetaLlmConfig } from "./meta";
export { MistralLlmProvider, resolveMistralConfig, type MistralLlmConfig } from "./mistral";
export { GeminiLlmProvider, resolveGeminiConfig, type GeminiLlmConfig } from "./gemini";
export { FallbackLlmProvider } from "./fallback";
export { FakeLlmProvider } from "./fake";

import { FallbackLlmProvider } from "./fallback";
import { GeminiLlmProvider } from "./gemini";
import { MetaLlmProvider } from "./meta";
import { MistralLlmProvider } from "./mistral";
import type { LlmProvider } from "./types";

const KNOWN = ["meta", "mistral", "gemini"] as const;
type ProviderName = (typeof KNOWN)[number];

function envHas(...names: string[]): boolean {
  return names.some((n) => Boolean(process.env[n]?.trim()));
}

/**
 * Fournisseurs configurés (clé présente), dans l'ordre demandé par
 * LLM_PROVIDER_ORDER (défaut meta,mistral,gemini). Meta reste le
 * fournisseur principal du hackathon ; Mistral puis Gemini ne servent
 * que de relais si Meta échoue ou n'est pas adapté à l'appel.
 */
export function resolveLlmProviders(): LlmProvider[] {
  const order = (process.env.LLM_PROVIDER_ORDER ?? KNOWN.join(","))
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s): s is ProviderName => (KNOWN as readonly string[]).includes(s));
  const uniqueOrder = [...new Set(order.length ? order : [...KNOWN])];

  const factories: Record<ProviderName, () => LlmProvider | null> = {
    meta: () =>
      envHas("MODEL_API_KEY", "META_API_KEY") ? new MetaLlmProvider() : null,
    mistral: () => (envHas("MISTRAL_API_KEY") ? new MistralLlmProvider() : null),
    gemini: () =>
      envHas("GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY") ? new GeminiLlmProvider() : null,
  };

  const providers = uniqueOrder
    .map((name) => factories[name]())
    .filter((p): p is LlmProvider => p !== null);
  // Aucune clé : Meta seul, pour garder son message d'erreur explicite.
  return providers.length ? providers : [new MetaLlmProvider()];
}

/** Point d'entrée unique pour obtenir le fournisseur LLM de production. */
export function createLlmProvider(): LlmProvider {
  const providers = resolveLlmProviders();
  return providers.length === 1 ? providers[0] : new FallbackLlmProvider(providers);
}
