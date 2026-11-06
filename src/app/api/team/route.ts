import { NextResponse } from "next/server";
import { fr, productName } from "@/i18n/fr";
import { ResendEmailNotificationProvider } from "@/providers/notification";
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
 * Invite un membre du personnel (owner uniquement). Aucun e-mail Supabase :
 * le compte Supabase de l'invité est préparé avec l'entreprise et le rôle
 * staff (jamais owner), puis un e-mail d'invitation est envoyé via Resend
 * si configuré. L'invité crée son compte Firebase avec la même adresse ;
 * à la vérification de l'e-mail, la passerelle le relie à ce compte et
 * attachInvitedStaff crée sa ligne staff.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = inviteSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const email = parsed.data.email.trim().toLowerCase();
  const metadata = {
    business_id: auth.ctx.businessId,
    role: "staff",
    display_name: parsed.data.displayName ?? null,
  };
  const admin = createAdminClient();

  const { data: existingId, error: rpcError } = await admin.rpc("auth_user_id_by_email", {
    p_email: email,
  });
  if (rpcError) return jsonError(500, fr.common.error);

  if (typeof existingId === "string") {
    const { data: staff } = await admin
      .from("staff")
      .select("id")
      .eq("user_id", existingId)
      .maybeSingle();
    if (staff) return jsonError(409, fr.team.alreadyMember);
    const { data: existing } = await admin.auth.admin.getUserById(existingId);
    const { error } = await admin.auth.admin.updateUserById(existingId, {
      user_metadata: { ...(existing.user?.user_metadata ?? {}), ...metadata },
    });
    if (error) return jsonError(500, fr.common.error);
  } else {
    const { error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) return jsonError(500, fr.common.error);
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || new URL(request.url).origin;
  const fill = (text: string) =>
    text
      .replaceAll("{business}", auth.ctx.business.name)
      .replaceAll("{product}", productName)
      .replaceAll("{link}", `${origin.replace(/\/$/, "")}/inscription?invitation=1`);
  const sent = await new ResendEmailNotificationProvider().notify({
    businessId: auth.ctx.businessId,
    channel: "email",
    email,
    title: fill(fr.team.inviteEmailSubject),
    body: fill(fr.team.inviteEmailBody),
  });

  return NextResponse.json({ invited: true, emailSent: sent.delivered }, { status: 201 });
}
