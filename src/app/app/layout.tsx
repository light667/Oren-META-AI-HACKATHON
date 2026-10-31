import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ClipboardList,
  Home,
  Link2,
  Menu as MenuIcon,
  MessagesSquare,
  Rocket,
  Store,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/logo";
import { SignOutButton } from "@/components/sign-out-button";
import { ThemeToggle } from "@/components/theme-toggle";
import { fr } from "@/i18n/fr";
import { getStaffContext } from "@/lib/server-context";
import { isSupabaseConfigured } from "@/lib/supabase/server";

// Espace connecté : session lue à chaque requête, pas de prérendu instantané.
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
  const links = [
    { href: "/app", label: fr.nav.dashboard, icon: Home },
    { href: "/app/commandes", label: fr.nav.orders, icon: ClipboardList },
    { href: "/app/conversations", label: fr.nav.conversations, icon: MessagesSquare },
    { href: "/app/menu", label: fr.nav.menu, icon: MenuIcon },
    { href: "/app/entreprise", label: fr.nav.business, icon: Store },
    ...(isOwner ? [{ href: "/app/equipe", label: fr.nav.team, icon: Users }] : []),
    ...(isOwner ? [{ href: "/app/mise-en-route", label: fr.nav.setup, icon: Rocket }] : []),
    { href: "/app/lien", label: fr.nav.linkQr, icon: Link2 },
  ];

  return (
    <div className="flex min-h-full flex-1">
      {/* Barre latérale (ordinateur) */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar md:flex">
        <div className="border-b px-5 py-4">
          <Link href="/" aria-label={fr.nav.home}>
            <Logo />
          </Link>
          <p className="truncate pt-3 text-sm font-semibold">{ctx.business.name}</p>
          <p className="text-xs text-muted-foreground">{fr.shell.mySpace}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label={fr.shell.mySpace}>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-sidebar-accent"
            >
              <link.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2 border-t px-5 py-4">
          <Badge variant="secondary">{isOwner ? fr.shell.roleOwner : fr.shell.roleStaff}</Badge>
          <ThemeToggle />
          <SignOutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pb-20 md:pb-0">
        {/* En-tête (mobile) */}
        <header className="border-b md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Link href="/" aria-label={fr.nav.home}>
              <Logo markClassName="h-8 w-8" wordmarkClassName="font-heading text-xl font-bold lowercase" />
            </Link>
            <div className="flex items-center gap-1.5">
              <Badge variant="secondary">{isOwner ? fr.shell.roleOwner : fr.shell.roleStaff}</Badge>
              <ThemeToggle />
              <SignOutButton />
            </div>
          </div>
          <p className="truncate px-4 pb-3 text-sm font-semibold">{ctx.business.name}</p>
        </header>

        <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
      </div>

      {/* Barre de navigation du bas (mobile) */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex overflow-x-auto border-t bg-background/95 backdrop-blur md:hidden"
        aria-label={fr.shell.mySpace}
      >
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex min-h-14 min-w-[72px] flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium"
          >
            <link.icon className="h-5 w-5" aria-hidden />
            <span className="max-w-full truncate">{link.label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
