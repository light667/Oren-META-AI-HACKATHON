import { z } from "zod";
import { confirmWebOrder, webConfirmSchema } from "@/channels/web";
import { createWebDeps, resolveBusinessBySlug } from "@/channels/web/server";
import { fr } from "@/i18n/fr";
import { notifyOrderReceived } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const instant = false;

const bodySchema = webConfirmSchema.extend({
  sessionId: z.string().trim().min(8).max(100),
});

type Params = { params: Promise<{ slug: string }> };

/** Bouton « Je confirme » : action structurée avec jeton, sans texte à interpréter. */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: parsed.error.issues[0]?.message ?? fr.chat.confirmError },
      { status: 400 },
    );
  }

  const deps = createWebDeps();
  const business = await resolveBusinessBySlug(deps, slug);
  if (!business) {
    return Response.json({ error: fr.chat.notFoundBody }, { status: 404 });
  }

  const result = await confirmWebOrder(deps, {
    businessId: business.id,
    sessionId: parsed.data.sessionId,
    token: parsed.data.token,
    customerName: parsed.data.customerName,
    customerPhone: parsed.data.customerPhone,
    paymentMethod: parsed.data.paymentMethod,
  });
  if (!result.ok) {
    return Response.json({ error: result.error }, { status: 409 });
  }
  // Alerte patron immédiate (temps réel + Web Push). Ne bloque pas le client.
  try {
    await notifyOrderReceived(
      createAdminClient(),
      { id: business.id, name: business.name },
      { id: result.orderId, totalFcfa: result.totalFcfa },
    );
  } catch {
    // L'alerte ne doit jamais faire échouer une commande confirmée.
  }
  return Response.json(result);
}
