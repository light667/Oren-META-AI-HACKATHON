import Link from "next/link";
import { CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { createClient } from "@/lib/supabase/server";

export const instant = false;

export default async function OwnerHomePage() {
  const ctx = await getStaffContext();
  const supabase = await createClient();
  const businessId = ctx?.businessId ?? "";

  const [menuRes, infoRes, zonesRes, conversationsRes] = await Promise.all([
    supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("business_info").select("opening_hours, address").eq("business_id", businessId).maybeSingle(),
    supabase.from("delivery_zones").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("conversations").select("id", { count: "exact", head: true }).eq("business_id", businessId),
  ]);

  const info = infoRes.data as { opening_hours?: Record<string, string>; address?: string | null } | null;
  const doneById: Record<string, boolean> = {
    menu: (menuRes.count ?? 0) > 0,
    hours: Boolean(info && Object.keys(info.opening_hours ?? {}).length > 0 && info.address),
    zones: (zonesRes.count ?? 0) > 0,
    test: (conversationsRes.count ?? 0) > 0,
    share: false,
  };
  const doneCount = fr.ownerHome.checklist.filter((item) => doneById[item.id]).length;
  const slug = ctx?.business.slug ?? "";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          {fr.ownerHome.title}
          {ctx?.business.name ? `, ${ctx.business.name}` : ""}
        </h1>
        <p className="mt-1 text-muted-foreground">{fr.ownerHome.subtitle}</p>
      </div>

      <Card className="shadow-[var(--shadow-soft)]">
        <CardHeader>
          <CardTitle>{fr.ownerHome.checklistTitle}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {doneCount}/{fr.ownerHome.checklist.length} {fr.ownerHome.progress}
          </p>
          <div
            className="h-2 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={fr.ownerHome.checklist.length}
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${(doneCount / fr.ownerHome.checklist.length) * 100}%` }}
            />
          </div>
        </CardHeader>
        <CardContent>
          <ol className="space-y-2">
            {fr.ownerHome.checklist.map((item) => {
              const done = doneById[item.id] ?? false;
              const href = item.id === "test" ? `/${slug}` : item.href;
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className="flex min-h-12 items-center gap-3 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-muted"
                  >
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success)]" aria-hidden />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
                    )}
                    <span className={done ? "text-muted-foreground line-through" : ""}>{item.label}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
          <div className="flex flex-wrap gap-3 pt-4">
            <Button render={<Link href="/app/commandes" />} className="h-11">
              {fr.ownerHome.goOrders}
            </Button>
            <Button render={<Link href={`/${slug}`} />} variant="outline" className="h-11">
              {fr.ownerHome.viewPublic}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
