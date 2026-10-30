import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";

/** Commandes de l'entreprise : visibles par tout le staff (pas un réglage). */
export async function GET() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id, status, total_fcfa, payment_method, payment_status, created_at")
    .eq("business_id", auth.ctx.businessId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ orders: data ?? [] });
}
