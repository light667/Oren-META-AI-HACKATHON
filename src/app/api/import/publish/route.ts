import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { restaurantDraftSchema } from "@/lib/import/draft";
import { createClient } from "@/lib/supabase/server";
import { deliveryZoneSchema, menuItemSchema } from "@/lib/validation";

export const instant = false;

/**
 * Publication — le SEUL endroit où le brouillon devient réel, après
 * vérification explicite du patron. Tout est revalidé ici avec les
 * schémas métier : prix FCFA entier strictement positif (un prix
 * resté « à saisir » bloque), frais entiers >= 0. Aucun texte extrait
 * n'est publié tel quel sans passer ces validations.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsedDraft = restaurantDraftSchema.safeParse(body);
  if (!parsedDraft.success) return jsonError(400, fr.setup.publishError);
  const draft = parsedDraft.data;

  if (draft.items.length === 0 && draft.zones.length === 0) {
    return jsonError(400, fr.setup.draftEmpty);
  }

  // Revalidation métier, plat par plat et zone par zone.
  const items = [];
  for (const item of draft.items) {
    const parsed = menuItemSchema.safeParse({
      name: item.name,
      description: item.description,
      category: item.category,
      priceFcfa: item.priceFcfa,
      available: true,
    });
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? fr.setup.publishError);
    }
    items.push(parsed.data);
  }
  const zones = [];
  for (const zone of draft.zones) {
    const parsed = deliveryZoneSchema.safeParse({
      neighborhood: zone.neighborhood,
      feeFcfa: zone.feeFcfa,
      isActive: true,
    });
    if (!parsed.success) {
      return jsonError(400, parsed.error.issues[0]?.message ?? fr.setup.publishError);
    }
    zones.push(parsed.data);
  }

  const supabase = await createClient();
  const businessId = auth.ctx.businessId;

  if (items.length > 0) {
    const { error } = await supabase.from("menu_items").insert(
      items.map((i) => ({
        business_id: businessId,
        name: i.name,
        description: i.description ?? null,
        category: i.category,
        price_fcfa: i.priceFcfa,
        available: true,
      })),
    );
    if (error) return jsonError(500, fr.setup.publishError);
  }

  if (zones.length > 0) {
    const { error } = await supabase.from("delivery_zones").insert(
      zones.map((zone) => ({
        business_id: businessId,
        neighborhood: zone.neighborhood,
        fee_fcfa: zone.feeFcfa,
        is_active: true,
      })),
    );
    if (error) return jsonError(500, fr.setup.publishError);
  }

  const groupLine = draft.info.groupBookings
    ? `Réservations de groupe : ${draft.info.groupBookings}`
    : null;
  const freeText = [draft.info.freeText, groupLine].filter(Boolean).join("\n") || null;
  const { error: infoError } = await supabase.from("business_info").upsert(
    {
      business_id: businessId,
      opening_hours: draft.info.openingHours,
      address: draft.info.address,
      rules: draft.info.rules,
      free_text: freeText,
    },
    { onConflict: "business_id" },
  );
  if (infoError) return jsonError(500, fr.setup.publishError);

  return NextResponse.json({
    published: true,
    items: items.length,
    zones: zones.length,
  });
}
