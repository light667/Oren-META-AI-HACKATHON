import { OrdersBoard, type OrderRow } from "@/components/orders-board";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function OrdersPage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, status, total_fcfa, payment_method, created_at, received_at, accepted_at")
    .eq("business_id", ctx?.businessId ?? "")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <OrdersBoard
      initialOrders={(data as OrderRow[] | null) ?? []}
      businessId={ctx?.businessId ?? ""}
      slug={ctx?.business.slug ?? ""}
    />
  );
}
