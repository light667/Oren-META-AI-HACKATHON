import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { deliveryZoneSchema } from "@/lib/validation";

type Params = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = deliveryZoneSchema.partial().safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const supabase = await createClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.neighborhood !== undefined) patch.neighborhood = parsed.data.neighborhood;
  if (parsed.data.feeFcfa !== undefined) patch.fee_fcfa = parsed.data.feeFcfa;
  if (parsed.data.isActive !== undefined) patch.is_active = parsed.data.isActive;
  const { data, error } = await supabase
    .from("delivery_zones")
    .update(patch)
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .select("id, neighborhood, fee_fcfa, is_active")
    .maybeSingle();
  if (error) return jsonError(500, fr.common.error);
  if (!data) return jsonError(404, fr.common.error);
  return NextResponse.json({ zone: data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const supabase = await createClient();
  const { error } = await supabase
    .from("delivery_zones")
    .delete()
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId);
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ deleted: true });
}
