import { AssistantSettings } from "@/components/assistant-settings";
import { BusinessManager, type BusinessInfoData, type ZoneData } from "@/components/business-manager";
import { BusinessQr } from "@/components/business-qr";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export default async function BusinessPage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();

  const [{ data: info }, { data: zones }] = await Promise.all([
    supabase
      .from("business_info")
      .select("opening_hours, address, rules, free_text")
      .eq("business_id", ctx?.businessId ?? "")
      .maybeSingle(),
    supabase
      .from("delivery_zones")
      .select("id, neighborhood, fee_fcfa, is_active")
      .eq("business_id", ctx?.businessId ?? "")
      .order("neighborhood"),
  ]);

  const { data: businessRow } = await supabase
    .from("businesses")
    .select("config")
    .eq("id", ctx?.businessId ?? "")
    .maybeSingle();
  const config = (businessRow?.config as Record<string, unknown> | undefined) ?? {};
  const alertDelay =
    typeof config.alert_delay_minutes === "number" ? config.alert_delay_minutes : 3;

  return (
    <div className="space-y-6">
      <AssistantSettings
        initialEnabled={config.assistant_enabled !== false}
        initialDelayMinutes={alertDelay}
        canEdit={ctx?.role === "owner"}
      />
      <BusinessManager
        info={(info as BusinessInfoData | null) ?? null}
        zones={(zones as ZoneData[] | null) ?? []}
        canEdit={ctx?.role === "owner"}
      />
      {ctx && <BusinessQr slug={ctx.business.slug} businessName={ctx.business.name} />}
    </div>
  );
}
