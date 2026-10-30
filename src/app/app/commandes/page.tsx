import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

interface OrderRow {
  id: string;
  status: string;
  total_fcfa: number;
  payment_method: string;
  created_at: string;
}

export default async function OrdersPage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, status, total_fcfa, payment_method, created_at")
    .eq("business_id", ctx?.businessId ?? "")
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data as OrderRow[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{fr.orders.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.orders.description}</p>
      </div>
      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {fr.orders.empty}
          </CardContent>
        </Card>
      ) : (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardContent className="flex items-center justify-between gap-3 pt-6">
                  <div>
                    <p className="text-sm font-medium">
                      {fr.orders.total} : {order.total_fcfa} {fr.common.currency}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {fr.orders.payment[order.payment_method] ?? order.payment_method} ·{" "}
                      {new Date(order.created_at).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {fr.orders.status[order.status] ?? order.status}
                  </Badge>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
