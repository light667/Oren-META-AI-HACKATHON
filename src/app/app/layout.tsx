import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { DesktopAppNav, MobileBottomNav } from "@/components/app-nav";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export const instant = false;

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return (
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <p className="text-sm text-muted-foreground">{fr.auth.notConfigured}</p>
      </main>
    );
  }

  const ctx = await getStaffContext();
  if (!ctx) redirect("/bienvenue");

  const isOwner = ctx.role === "owner";

  return (
    <div className="flex min-h-full flex-1 bg-background text-foreground antialiased">
      {/* Barre latérale Bureau (style Linear / Stripe) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border/60 bg-sidebar/70 backdrop-blur-md md:flex">
        {/* En-tête de marque */}
        <div className="border-b border-border/60 p-4">
          <Link href="/" aria-label={fr.nav.home} className="inline-block transition-transform hover:scale-105">
            <Logo markClassName="h-7 w-7" wordmarkClassName="font-heading text-xl font-bold tracking-tight text-foreground" />
          </Link>

          {/* Profil entreprise connecté */}
          <div className="mt-3.5 flex items-center gap-2.5 rounded-2xl border border-border/60 bg-card/60 p-2.5">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c] font-bold">
              <span>{ctx.business.name.charAt(0).toUpperCase()}</span>
              <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-background bg-[#0ebb7c]" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold leading-tight text-foreground">{ctx.business.name}</p>
              <p className="text-[10px] text-muted-foreground">{fr.shell.mySpace}</p>
            </div>
          </div>
        </div>

        {/* Navigation Bureau interactive */}
        <DesktopAppNav isOwner={isOwner} />

        {/* Pied de barre latérale avec contrôles */}
        <div className="border-t border-border/60 p-3 space-y-2">
          <div className="flex items-center justify-between px-1">
            <Badge
              variant="secondary"
              className={
                isOwner
                  ? "bg-[#0ebb7c]/10 text-[#0ebb7c] text-[10px] font-bold"
                  : "bg-secondary text-muted-foreground text-[10px]"
              }
            >
              {isOwner ? fr.shell.roleOwner : fr.shell.roleStaff}
            </Badge>
            <div className="flex items-center gap-1.5">
              <LanguageToggle />
              <ThemeToggle />
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Contenu principal */}
      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* En-tête mobile */}
        <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 px-4 py-3 backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link href="/" aria-label={fr.nav.home}>
              <Logo markClassName="h-7 w-7" wordmarkClassName="font-heading text-lg font-bold tracking-tight" />
            </Link>

            <div className="flex items-center gap-1.5">
              <Badge
                variant="secondary"
                className={
                  isOwner
                    ? "bg-[#0ebb7c]/10 text-[#0ebb7c] text-[10px] font-bold"
                    : "bg-secondary text-muted-foreground text-[10px]"
                }
              >
                {isOwner ? fr.shell.roleOwner : fr.shell.roleStaff}
              </Badge>
              <LanguageToggle />
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#0ebb7c]" />
            <p className="truncate text-xs font-bold text-foreground">{ctx.business.name}</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
      </div>

      {/* Barre de navigation mobile du bas */}
      <MobileBottomNav isOwner={isOwner} />
    </div>
  );
}
