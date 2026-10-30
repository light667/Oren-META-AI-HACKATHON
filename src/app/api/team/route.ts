import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner, requireStaff } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { inviteSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireStaff();
  if ("response" in auth) return auth.response;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, user_id, role, display_name, created_at")
    .eq("business_id", auth.ctx.businessId)
    .order("created_at");
  if (error) return jsonError(500, fr.common.error);
  return NextResponse.json({ members: data ?? [], currentUserId: auth.ctx.user.id });
}

/**
 * Invite un membre du personnel (owner uniquement). Supabase Auth envoie
 * le lien ; le rattachement staff (rôle staff, jamais owner) se fait à
 * la première connexion de l'invité, dans attachInvitedStaff.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const origin = new URL(request.url).origin;
  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    data: {
      business_id: auth.ctx.businessId,
      role: "staff",
      display_name: parsed.data.displayName ?? null,
    },
    redirectTo: `${origin}/auth/callback`,
  });
  if (error) return jsonError(400, error.message);
  return NextResponse.json({ invited: true }, { status: 201 });
}
