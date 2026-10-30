import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string().min(1), auth: z.string().min(1) }),
});

/** Enregistre l'abonnement Web Push du membre connecté (RLS : le sien). */
export async function POST(request: Request) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, fr.common.error);

  const supabase = await createClient();
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      business_id: auth.ctx.businessId,
      user_id: auth.ctx.user.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.keys.p256dh,
      auth: parsed.data.keys.auth,
    },
    { onConflict: "endpoint" },
  );
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ subscribed: true }, { status: 201 });
}
