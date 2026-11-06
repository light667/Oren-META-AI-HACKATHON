import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Vérification d'un jeton d'identité Firebase (ID token) côté serveur,
 * sans SDK admin ni compte de service : signature RS256 contrôlée avec
 * les clés publiques Google, émetteur et audience = projet Firebase.
 * Référence : Firebase « Verify ID tokens using a third-party JWT library ».
 */
const GOOGLE_JWKS_URL =
  "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";

let remoteJwks: JWTVerifyGetKey | null = null;
function googleJwks(): JWTVerifyGetKey {
  remoteJwks ??= createRemoteJWKSet(new URL(GOOGLE_JWKS_URL));
  return remoteJwks;
}

export interface FirebaseIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  provider: string;
}

export class FirebaseTokenError extends Error {
  constructor(
    message: string,
    readonly code: "not_configured" | "invalid_token" | "no_email",
  ) {
    super(message);
    this.name = "FirebaseTokenError";
  }
}

export function firebaseProjectId(): string | null {
  return (
    process.env.FIREBASE_PROJECT_ID?.trim() ||
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim() ||
    null
  );
}

export async function verifyFirebaseIdToken(
  idToken: string,
  opts: { projectId?: string | null; keys?: JWTVerifyGetKey } = {},
): Promise<FirebaseIdentity> {
  const projectId = opts.projectId ?? firebaseProjectId();
  if (!projectId) {
    throw new FirebaseTokenError("Firebase non configuré.", "not_configured");
  }
  let payload: Record<string, unknown>;
  try {
    const verified = await jwtVerify(idToken, opts.keys ?? googleJwks(), {
      algorithms: ["RS256"],
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
      clockTolerance: 30,
    });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    throw new FirebaseTokenError("Jeton Firebase invalide.", "invalid_token");
  }

  const uid = typeof payload.sub === "string" ? payload.sub : "";
  if (!uid || uid.length > 128) {
    throw new FirebaseTokenError("Jeton Firebase invalide.", "invalid_token");
  }
  const authTime = Number(payload.auth_time);
  if (!Number.isFinite(authTime) || authTime * 1000 > Date.now() + 30_000) {
    throw new FirebaseTokenError("Jeton Firebase invalide.", "invalid_token");
  }
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  if (!email) throw new FirebaseTokenError("Compte sans e-mail.", "no_email");

  const firebase = (payload.firebase ?? {}) as { sign_in_provider?: unknown };
  return {
    uid,
    email,
    emailVerified: payload.email_verified === true,
    provider:
      typeof firebase.sign_in_provider === "string" ? firebase.sign_in_provider : "password",
  };
}
