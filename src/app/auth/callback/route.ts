import { NextResponse } from "next/server";
import { attachInvitedStaff } from "@/lib/onboarding";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien e-mail (connexion, inscription, invitation).
 * Échange le code contre une session, rattache un invité à son
 * entreprise, puis route : espace si déjà membre, finalisation sinon.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const origin = url.origin;

  if (!code) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/connexion?erreur=lien`);
  }

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
