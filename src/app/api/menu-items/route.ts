import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { menuItemSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, description, price_fcfa, category, available")
    .eq("business_id", auth.ctx.businessId)
    .order("category")
    .order("name");
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ items: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  // Validation Zod : prix FCFA entier strictement positif, sans décimales.
  const parsed = menuItemSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .insert({
      business_id: auth.ctx.businessId,
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      category: parsed.data.category,
      price_fcfa: parsed.data.priceFcfa,
      available: parsed.data.available,
    })
    .select("id, name, description, price_fcfa, category, available")
    .single();
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ item: data }, { status: 201 });
}
