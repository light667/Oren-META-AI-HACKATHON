import { MenuManager, type MenuItemData } from "@/components/menu-manager";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export default async function MenuPage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("menu_items")
    .select("id, name, description, price_fcfa, category, available")
    .eq("business_id", ctx?.businessId ?? "")
    .order("category")
    .order("name");

  return <MenuManager items={(data as MenuItemData[] | null) ?? []} canEdit={ctx?.role === "owner"} />;
}
