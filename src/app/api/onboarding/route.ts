import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError } from "@/lib/api";
import { attachInvitedStaff, createBusinessForUser } from "@/lib/onboarding";
import { getCurrentUser } from "@/lib/server-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { onboardingSchema } from "@/lib/validation";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return jsonError(401, fr.auth.callbackError);

  const admin = createAdminClient();

  // Invité (métadonnées posées à l'invitation) : rattachement direct.
  const invited = await attachInvitedStaff(admin, user);
  if (invited) {
    if (!invited.ok) return jsonError(invited.status, invited.error);
    return NextResponse.json({ businessId: invited.businessId, role: invited.role });
  }

  const body: unknown = await request.json().catch(() => null);
  const parsed = onboardingSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError(400, parsed.error.issues[0]?.message ?? fr.common.error);
  }
  const result = await createBusinessForUser(admin, user, parsed.data);
  if (!result.ok) return jsonError(result.status, result.error);
  return NextResponse.json({ businessId: result.businessId, role: result.role });
}
