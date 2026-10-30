import type { SupabaseClient, User } from "@supabase/supabase-js";
import { fr } from "@/i18n/fr";
import type { z } from "zod";
import type { onboardingSchema } from "@/lib/validation";

type OnboardingInput = z.infer<typeof onboardingSchema>;

export type OnboardingResult =
  | { ok: true; businessId: string; role: "owner" | "staff" }
  | { ok: false; status: number; error: string };

/**
 * Crée l'entreprise d'un patron nouvellement connecté, sa ligne staff
 * (owner) et sa fiche business_info vide. Passer par service_role est
 * nécessaire : la création d'entreprise n'est pas ouverte en direct
 * (aucune politique d'insertion sur businesses). Le slug est revérifié
 * ici, côté serveur, jamais sur la seule parole du client.
 */
export async function createBusinessForUser(
  admin: SupabaseClient,
  user: User,
  input: OnboardingInput,
): Promise<OnboardingResult> {
  const { data: existing } = await admin
    .from("businesses")
    .select("id")
    .eq("slug", input.slug)
    .maybeSingle();
  if (existing) {
    return { ok: false, status: 409, error: fr.validation.slugTaken };
  }

  const { data: business, error: businessError } = await admin
    .from("businesses")
    .insert({
      name: input.businessName,
      slug: input.slug,
      business_type: input.businessType,
      config: { phone: input.phone },
      enabled_capabilities: ["catalog_orders"],
    })
    .select("id")
    .single();
  if (businessError || !business) {
    const taken = businessError?.code === "23505";
    return {
      ok: false,
      status: taken ? 409 : 500,
      error: taken ? fr.validation.slugTaken : fr.common.error,
    };
  }

  const { error: staffError } = await admin.from("staff").insert({
    user_id: user.id,
    business_id: business.id,
    role: "owner",
    display_name: input.businessName,
  });
  if (staffError) {
    return { ok: false, status: 500, error: fr.common.error };
  }

  await admin.from("business_info").insert({ business_id: business.id });
  return { ok: true, businessId: business.id as string, role: "owner" };
}

/**
 * Rattache un invité à l'entreprise de l'invitation. Les métadonnées
 * (business_id, role) ont été posées par inviteUserByEmail côté serveur
 * au moment de l'invitation ; on ne fait confiance qu'à elles, et la
 * ligne créée est toujours au rôle staff, jamais owner.
 */
export async function attachInvitedStaff(
  admin: SupabaseClient,
  user: User,
): Promise<OnboardingResult | null> {
  const businessId = user.user_metadata?.business_id as string | undefined;
  if (!businessId) return null;

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .maybeSingle();
  if (!business) {
    return { ok: false, status: 400, error: fr.common.error };
  }

  const { error } = await admin.from("staff").insert({
    user_id: user.id,
    business_id: businessId,
    role: "staff",
    display_name: (user.user_metadata?.display_name as string | undefined) ?? null,
  });
  if (error) {
    // Déjà rattaché (double clic, lien rouvert) : ce n'est pas une erreur.
    if (error.code === "23505") {
      return { ok: true, businessId, role: "staff" };
    }
    return { ok: false, status: 500, error: fr.common.error };
  }
  return { ok: true, businessId, role: "staff" };
}
