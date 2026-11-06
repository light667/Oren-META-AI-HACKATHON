import { NextResponse } from "next/server";
import { z } from "zod";
import { fr } from "@/i18n/fr";
import { jsonError } from "@/lib/api";
import { createSessionTokenHash, linkFirebaseIdentity } from "@/lib/auth-bridge";
import { FirebaseTokenError, verifyFirebaseIdToken } from "@/lib/firebase/verify-token";
import { attachInvitedStaff } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation";

const bodySchema = z.object({
  idToken: z.string().min(20).max(8192),
  signup: z.unknown().optional(),
});

/**
 * Ouvre la session Supabase à partir d'une connexion Firebase.
 * 1. Vérifie le jeton Firebase (signature Google, projet, e-mail vérifié).
 * 2. Relie ce compte Firebase à son compte Supabase propre (créé au besoin).
 * 3. Ouvre la session Supabase (cookies) sans envoyer d'e-mail.
 * 4. Rattache un invité à son entreprise, puis indique où aller.
 */
export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError(400, fr.common.error);

  let identity;
  try {
    identity = await verifyFirebaseIdToken(parsed.data.idToken);
  } catch (error) {
    if (error instanceof FirebaseTokenError && error.code === "not_configured") {
      return jsonError(503, fr.auth.notConfigured);
    }
    return jsonError(401, fr.auth.callbackError);
  }
  if (!identity.emailVerified) {
    return NextResponse.json(
      { error: fr.auth.verifyPending, code: "email_not_verified" },
      { status: 403 },
    );
  }

  // Données d'inscription : facultatives, validées, jamais bloquantes.
  const signupParsed = onboardingSchema.safeParse(parsed.data.signup);
  const signup = signupParsed.success
    ? {
        business_name: signupParsed.data.businessName,
        business_type: signupParsed.data.businessType,
        slug: signupParsed.data.slug,
        phone: signupParsed.data.phone,
      }
    : undefined;

  const admin = createAdminClient();
  const linked = await linkFirebaseIdentity(admin, identity, signup).catch(() => null);
  if (!linked?.ok) {
    if (linked?.reason === "email_mismatch") return jsonError(409, fr.auth.emailMismatch);
    return jsonError(500, fr.common.error);
  }

  const tokenHash = await createSessionTokenHash(admin, identity.email);
  if (!tokenHash) return jsonError(500, fr.common.error);

  const supabase = await createClient();
  const { error: otpError } = await supabase.auth.verifyOtp({
    type: "email",
    token_hash: tokenHash,
  });
  if (otpError) return jsonError(500, fr.common.error);

  try {
    await attachInvitedStaff(admin, linked.user);
  } catch {
    // /bienvenue retentera le rattachement.
  }

  const { data: staff } = await admin
    .from("staff")
    .select("id")
    .eq("user_id", linked.user.id)
    .maybeSingle();

  return NextResponse.json({ redirect: staff ? "/app/commandes" : "/bienvenue" });
}

/** Ferme la session Supabase (cookies). Firebase est fermé côté navigateur. */
export async function DELETE() {
  const supabase = await createClient();
  await supabase.auth.signOut().catch(() => null);
  return NextResponse.json({ ok: true });
}
