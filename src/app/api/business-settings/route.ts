import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const bodySchema = z.object({
  assistantEnabled: z.boolean().optional(),
  alertDelayMinutes: z.number().int().min(1).max(120).optional(),
});

/**
 * Réglages patron stockés dans businesses.config : coupe-assistant
 * (effet immédiat, le cœur lit la config à chaque message) et délai
 * d'alerte e-mail de secours. Owner uniquement.
 */
export async function PATCH(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, fr.common.error);

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("config")
    .eq("id", auth.ctx.businessId)
    .maybeSingle();
  const config = { ...((business?.config as Record<string, unknown>) ?? {}) };
  if (parsed.data.assistantEnabled !== undefined) {
    config.assistant_enabled = parsed.data.assistantEnabled;
  }
  if (parsed.data.alertDelayMinutes !== undefined) {
    config.alert_delay_minutes = parsed.data.alertDelayMinutes;
  }
  const { error } = await admin
    .from("businesses")
    .update({ config })
    .eq("id", auth.ctx.businessId);
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ config });
}
