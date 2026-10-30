export * from "./types";
export { MetaLlmProvider, resolveMetaConfig, type MetaLlmConfig } from "./meta";
export { FakeLlmProvider } from "./fake";

import { MetaLlmProvider } from "./meta";
import type { LlmProvider } from "./types";

/** Point d'entrée unique pour obtenir le fournisseur LLM de production. */
export function createLlmProvider(): LlmProvider {
  return new MetaLlmProvider();
}
