import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

type Params = { params: Promise<{ id: string }> };

/** Rendre la main à l'assistant : réactive le fil et le rouvre. */
export async function POST(_request: Request, { params }: Params) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("conversations")
    .update({ assistant_paused: false, status: "en_cours" })
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .select("id, status, assistant_paused")
    .maybeSingle();
  if (error) return jsonError(500, fr.common.error);
  if (!data) return jsonError(404, fr.common.error);
  return NextResponse.json({ conversation: data });
}
