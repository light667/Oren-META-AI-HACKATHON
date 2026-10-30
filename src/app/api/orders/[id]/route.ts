import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireStaff } from "@/lib/api";
import { canTransition, isOrderStatus, ownerNextStatuses } from "@/lib/order-transitions";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({ status: z.string().min(1) });

type Params = { params: Promise<{ id: string }> };

/**
 * Transition de statut par le patron. La machine à états refuse toute
 * transition interdite (409), et l'acceptation enregistre accepted_at
 * (le délai d'acceptation est donc conservé et affichable).
 */
export async function PATCH(request: Request, { params }: Params) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success || !isOrderStatus(parsed.data.status)) {
    return jsonError(400, fr.orders.transitionRefused);
  }
  const target = parsed.data.status;

  const supabase = await createClient();
  const { data: current } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .maybeSingle();
  if (!current) return jsonError(404, fr.common.error);

  const from = String(current.status);
  if (!canTransition(from, target) || !ownerNextStatuses(from).includes(target)) {
    return jsonError(409, fr.orders.transitionRefused);
  }

  const patch: Record<string, unknown> = { status: target };
  if (target === "accepted") patch.accepted_at = new Date().toISOString();
  if (target === "confirmed") patch.received_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .select("id, status, total_fcfa, payment_method, created_at, received_at, accepted_at")
    .maybeSingle();
  if (error) return jsonError(500, fr.common.error);
  if (!data) return jsonError(404, fr.common.error);
  return NextResponse.json({ order: data });
}
