import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, ExternalLink, Sparkles, Store } from "lucide-react";
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
  const progressPercent = Math.round((doneCount / fr.ownerHome.checklist.length) * 100);

  return (
    <div className="space-y-8">
      {/* Salutation et statut */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0ebb7c] animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-[#0ebb7c]">En service</span>
          </div>
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
            {fr.ownerHome.title}
            {ctx?.business.name ? `, ${ctx.business.name}` : ""}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.ownerHome.subtitle}</p>
        </div>

        <Link
          href={`/${slug}`}
          target="_blank"
          className="inline-flex h-10 items-center gap-2 rounded-xl border border-border/70 bg-card px-4 text-xs font-semibold text-foreground transition-all hover:border-[#0ebb7c]/50 hover:bg-secondary"
        >
          <ExternalLink className="h-3.5 w-3.5 text-[#0ebb7c]" />
          <span>{fr.ownerHome.viewPublic}</span>
        </Link>
      </div>

      {/* Carte Checklist de démarrage */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#0ebb7c]" />
              <h2 className="font-heading text-xl font-bold tracking-tight text-foreground">
                {fr.ownerHome.checklistTitle}
              </h2>
            </div>
            <p className="text-xs text-muted-foreground">
              {doneCount}/{fr.ownerHome.checklist.length} {fr.ownerHome.progress} ({progressPercent}%)
            </p>
          </div>

          {/* Jauge de progression */}
          <div className="w-full sm:w-48">
            <div
              className="h-2.5 overflow-hidden rounded-full bg-secondary"
              role="progressbar"
              aria-valuenow={doneCount}
              aria-valuemin={0}
              aria-valuemax={fr.ownerHome.checklist.length}
            >
              <div
                className="h-full rounded-full bg-[#0ebb7c] transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Liste des étapes */}
        <ol className="mt-6 space-y-2.5">
          {fr.ownerHome.checklist.map((item, index) => {
            const done = doneById[item.id] ?? false;
            const href = item.id === "test" ? `/${slug}` : item.href;
            return (
              <li key={item.id}>
                <Link
                  href={href}
                  className={`group flex items-center justify-between rounded-2xl border p-4 text-sm font-semibold transition-all duration-200 ${
                    done
                      ? "border-border/40 bg-secondary/20 text-muted-foreground"
                      : "border-border/80 bg-card/60 text-foreground hover:border-[#0ebb7c]/60 hover:bg-secondary/40 shadow-xs"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-[#0ebb7c]" aria-hidden />
                    ) : (
                      <Circle className="h-5 w-5 shrink-0 text-muted-foreground/60 group-hover:text-[#0ebb7c]" aria-hidden />
                    )}
                    <span className={done ? "line-through text-muted-foreground/70" : ""}>
                      {item.label}
                    </span>
                  </div>

                  <ArrowRight className="h-4 w-4 text-muted-foreground/50 transition-transform group-hover:translate-x-1 group-hover:text-[#0ebb7c]" />
                </Link>
              </li>
            );
          })}
        </ol>

        {/* Boutons d'action rapides */}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Link
            href="/app/commandes"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#0ebb7c] px-6 text-sm font-bold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e] active:scale-95 transition-all"
          >
            <span>{fr.ownerHome.goOrders}</span>
            <ArrowRight className="h-4 w-4" />
          </Link>

          <Link
            href={`/${slug}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border/80 bg-card px-6 text-sm font-semibold text-foreground hover:bg-secondary active:scale-95 transition-all"
          >
            <span>{fr.ownerHome.viewPublic}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
