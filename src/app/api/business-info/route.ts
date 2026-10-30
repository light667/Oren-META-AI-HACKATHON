import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { businessInfoSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_info")
    .select("id, opening_hours, address, rules, free_text")
    .eq("business_id", auth.ctx.businessId)
    .maybeSingle();
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ info: data });
}

export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = businessInfoSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("business_info")
    .upsert(
      {
        business_id: auth.ctx.businessId,
        opening_hours: parsed.data.openingHours,
        address: parsed.data.address ?? null,
        rules: parsed.data.rules ?? null,
        free_text: parsed.data.freeText ?? null,
      },
      { onConflict: "business_id" },
    )
    .select("id, opening_hours, address, rules, free_text")
    .single();
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ info: data });
}
