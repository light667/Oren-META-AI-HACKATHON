import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { menuItemSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

/** Modifie un plat, y compris sa désactivation (available = false). Owner uniquement. */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = menuItemSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) patch.name = parsed.data.name;
  if (parsed.data.description !== undefined) patch.description = parsed.data.description;
  if (parsed.data.category !== undefined) patch.category = parsed.data.category;
  if (parsed.data.priceFcfa !== undefined) patch.price_fcfa = parsed.data.priceFcfa;
  if (parsed.data.available !== undefined) patch.available = parsed.data.available;
  const { data, error } = await supabase
    .from("menu_items")
    .update(patch)
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .select("id, name, description, price_fcfa, category, available")
    .maybeSingle();
  if (error) return jsonError(500, fr.common.error);
  if (!data) return jsonError(404, fr.common.error);
  return NextResponse.json({ item: data });
}
