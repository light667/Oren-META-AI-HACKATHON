/**
 * Erreur « trop de demandes » de Supabase Auth (HTTP 429) : demandes
 * répétées de lien e-mail ou clics multiples. À distinguer d'un lien
 * invalide, sinon l'utilisateur redemande un lien en boucle et
 * aggrave le blocage (seul le dernier lien envoyé reste valable).
 */
export function isRateLimitError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { status?: unknown; code?: unknown; message?: unknown; name?: unknown };
  if (e.status === 429) return true;
  const text = [e.code, e.name, e.message]
    .filter((v): v is string => typeof v === "string")
    .join(" ")
    .toLowerCase();
  return text.includes("rate") || text.includes("too many") || text.includes("429");
}

export function authErrorMessage(
  error: unknown,
  messages: { rateLimited: string; generic: string },
): string {
  return isRateLimitError(error) ? messages.rateLimited : messages.generic;
}
