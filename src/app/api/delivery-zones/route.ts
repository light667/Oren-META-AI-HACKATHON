import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { deliveryZoneSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .select("id, neighborhood, fee_fcfa, is_active")
    .eq("business_id", auth.ctx.businessId)
    .order("neighborhood");
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ zones: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = deliveryZoneSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("delivery_zones")
    .insert({
      business_id: auth.ctx.businessId,
      neighborhood: parsed.data.neighborhood,
      fee_fcfa: parsed.data.feeFcfa,
      is_active: parsed.data.isActive,
    })
    .select("id, neighborhood, fee_fcfa, is_active")
    .single();
  if (error) return jsonError(error.code === "23505" ? 409 : 500, fr.common.error);
  return NextResponse.json({ zone: data }, { status: 201 });
}
