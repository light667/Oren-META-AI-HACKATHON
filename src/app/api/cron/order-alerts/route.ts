import { sendFallbackEmails } from "@/lib/order-notifications";
import { createAdminClient } from "@/lib/supabase/admin";

export const instant = false;

/**
 * E-mail de secours des commandes non acceptées (délai réglable,
 * 3 minutes par défaut). Appelé chaque minute par Vercel Cron
 * (voir vercel.json) ; protégé par CRON_SECRET.
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
