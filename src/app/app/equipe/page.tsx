import { TeamManager, type MemberData } from "@/components/team-manager";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export default async function TeamPage() {
  const ctx = await getStaffContext();
  if (ctx?.role !== "owner") {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">{fr.team.title}</h1>
        <p className="rounded-md bg-muted px-3 py-2 text-sm">{fr.common.ownerOnly}</p>
      </div>
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id, user_id, role, display_name")
    .eq("business_id", ctx.businessId)
    .order("created_at");

  return (
    <TeamManager
      members={(data as MemberData[] | null) ?? []}
      currentUserId={ctx.user.id}
      canInvite
    />
  );
}
