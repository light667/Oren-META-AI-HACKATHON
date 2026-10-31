import { sendFallbackEmails } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const instant = false;

/**
 * E-mail de secours des commandes non acceptées (délai réglable,
 * 3 minutes par défaut).
 *
 * Déclenchement principal : un cron EXTERNE gratuit (cron-job.org)
 * appelle cette route toutes les minutes — voir docs/ALERTES_CRON.md.
 * Le cron Vercel de vercel.json n'est qu'un filet de sécurité quotidien :
 * sur le forfait gratuit (Hobby), Vercel limite les crons à une fois
 * par jour et refuse au déploiement toute expression plus fréquente,
 * ce qui ne peut pas servir un délai de 3 minutes.
 *
 * Protection : en-tête `x-cron-secret: <CRON_SECRET>` ou
 * `Authorization: Bearer <CRON_SECRET>`. GET et POST acceptés.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "CRON_SECRET non configuré" }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  const cronHeader = request.headers.get("x-cron-secret");
  if (auth !== `Bearer ${secret}` && cronHeader !== secret) {
    return Response.json({ error: "Non autorisé" }, { status: 401 });
  }
  const sent = await sendFallbackEmails(createAdminClient());
  return Response.json({ sent });
}

export const GET = handle;
export const POST = handle;
