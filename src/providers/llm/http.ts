/**
 * fetch avec délai maximal pour les appels aux fournisseurs LLM.
 * Sans délai, un fournisseur qui ne répond plus bloque la requête
 * jusqu'à la limite de la fonction serveur et le relais
 * (FallbackLlmProvider) ne se déclenche jamais. Ici, l'appel est
 * interrompu (AbortError/TimeoutError) et le fournisseur suivant prend
 * la main. Réglable par LLM_TIMEOUT_MS (défaut 30 s).
 */
export const DEFAULT_LLM_TIMEOUT_MS = 30_000;

export function llmTimeoutMs(): number {
  const raw = Number(process.env.LLM_TIMEOUT_MS);
  return Number.isFinite(raw) && raw >= 1_000 ? Math.floor(raw) : DEFAULT_LLM_TIMEOUT_MS;
}

export function withTimeout(fetchFn: typeof fetch, timeoutMs = llmTimeoutMs()): typeof fetch {
  return (input, init = {}) => {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal = init.signal ? AbortSignal.any([init.signal, timeout]) : timeout;
    return fetchFn(input, { ...init, signal });
  };
}

/** fetch global avec délai : valeur par défaut des trois fournisseurs. */
export function defaultLlmFetch(): typeof fetch {
  return withTimeout((input, init) => fetch(input, init));
}
