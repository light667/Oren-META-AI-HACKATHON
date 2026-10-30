import { createWebDeps, resolveBusinessBySlug } from "@/channels/web/server";
import { fr } from "@/i18n/fr";

export const instant = false;

type Params = { params: Promise<{ slug: string }> };

/**
 * Statut d'une commande pour le client qui l'a passée : vérifié par la
 * session anonyme propriétaire de la commande. C'est ce qui permet au
 * statut de changer à l'écran du client sans recharger (interrogation
 * légère côté page, l'anon n'ayant aucun accès direct aux tables).
 */
export async function GET(request: Request, { params }: Params) {
  const { slug } = await params;
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId") ?? "";
  const orderId = url.searchParams.get("orderId") ?? "";
  if (sessionId.length < 8 || !orderId) {
    return Response.json({ error: fr.common.error }, { status: 400 });
  }

  const deps = createWebDeps();
  const business = await resolveBusinessBySlug(deps, slug);
  if (!business) return Response.json({ error: fr.chat.notFoundBody }, { status: 404 });

  const session = await deps.store.getOrCreateSession(business.id, sessionId);
  const order = await deps.store.getOrder(business.id, orderId);
  if (!order || order.sessionId !== session.id) {
    return Response.json({ error: fr.common.error }, { status: 404 });
  }
  return Response.json({
    orderId: order.id,
    status: order.status,
    totalFcfa: order.totalFcfa,
  });
}
