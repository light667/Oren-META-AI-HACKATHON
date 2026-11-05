import { NextResponse } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { attachInvitedStaff } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Route serveur par nature : lit les cookies, échange le code
// Supabase contre une session (dynamique par construction).
const OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
];

/**
 * Retour du lien e-mail (connexion, inscription, invitation).
 * Deux formats possibles selon le modèle d'e-mail Supabase :
 * `?code=` (flux PKCE) ou `?token_hash=&type=` (vérification OTP).
 * Échange contre une session, rattache un invité à son entreprise,
 * puis route : espace si déjà membre, finalisation sinon.
 * Tout échec renvoie sur /connexion?erreur=lien, jamais l'accueil.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = url.origin;
  const fail = () =>
    NextResponse.redirect(`${origin}/connexion?erreur=lien`);

  // Supabase renvoie ?error=... quand le lien est expiré/refusé.
  if (url.searchParams.get("error")) return fail();

  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!code && !(tokenHash && type && OTP_TYPES.includes(type))) {
    return fail();
  }

  const supabase = await createClient();
  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: type! });
  if (error) return fail();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail();

  // Invité : créer sa ligne staff (rôle staff) dès la première connexion.
  try {
    await attachInvitedStaff(createAdminClient(), user);
  } catch {
    // La page /bienvenue retentera le rattachement proprement.
  }

  const { data: staff } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.redirect(
    staff ? `${origin}/app/commandes` : `${origin}/bienvenue`,
  );
}
