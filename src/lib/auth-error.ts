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

/** Clés de message (t.auth.*) pour les erreurs Firebase Auth. */
export type FirebaseAuthErrorKey =
  | "invalidCredentials"
  | "emailInUse"
  | "weakPassword"
  | "rateLimited"
  | "network"
  | "providerDisabled"
  | "cancelled"
  | "generic";

export function firebaseAuthErrorKey(error: unknown): FirebaseAuthErrorKey {
  const code =
    error && typeof error === "object" && typeof (error as { code?: unknown }).code === "string"
      ? (error as { code: string }).code
      : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
    case "auth/user-disabled":
      return "invalidCredentials";
    case "auth/email-already-in-use":
    case "auth/account-exists-with-different-credential":
      return "emailInUse";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "weakPassword";
    case "auth/too-many-requests":
    case "auth/quota-exceeded":
      return "rateLimited";
    case "auth/network-request-failed":
    case "auth/timeout":
      return "network";
    case "auth/operation-not-allowed":
    case "auth/unauthorized-domain":
    case "auth/configuration-not-found":
      return "providerDisabled";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "cancelled";
    default:
      return isRateLimitError(error) ? "rateLimited" : "generic";
  }
}
