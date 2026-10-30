import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireStaff } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({ content: z.string().trim().min(1).max(4000) });

type Params = { params: Promise<{ id: string }> };

/**
 * Prise de contrôle : le patron répond dans la conversation.
 * Sa réponse met l'assistant en pause sur ce fil (assistant_paused),
 * jusqu'au « Rendre la main à l'assistant » explicite.
 */
export async function POST(request: Request, { params }: Params) {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, fr.common.error);

  const supabase = await createClient();
  const { data: conversation } = await supabase
    .from("conversations")
    .select("id, status")
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId)
    .maybeSingle();
  if (!conversation) return jsonError(404, fr.common.error);

  const { data, error } = await supabase
    .from("messages")
    .insert({
      business_id: auth.ctx.businessId,
      conversation_id: id,
      sender_role: "human",
      content: parsed.data.content,
    })
    .select("id, sender_role, content, created_at")
    .single();
  if (error) return jsonError(500, fr.common.error);

  // Pause immédiate de l'assistant sur ce fil + file « à reprendre ».
  await supabase
    .from("conversations")
    .update({ assistant_paused: true, status: "a_reprendre" })
    .eq("id", id)
    .eq("business_id", auth.ctx.businessId);

  return NextResponse.json({ message: data }, { status: 201 });
}
