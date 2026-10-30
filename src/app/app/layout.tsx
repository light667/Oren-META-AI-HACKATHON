import Link from "next/link";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { SignOutButton } from "@/components/sign-out-button";
import { fr, productName } from "@/i18n/fr";
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
    ...(isOwner ? [{ href: "/app/entreprise", label: fr.nav.business }] : []),
    { href: "/app/menu", label: fr.nav.menu },
    { href: "/app/commandes", label: fr.nav.orders },
    { href: "/app/conversations", label: fr.conversations.title },
    ...(isOwner ? [{ href: "/app/equipe", label: fr.nav.team }] : []),
  ];

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{ctx.business.name}</p>
            <p className="text-xs text-muted-foreground">
              {productName} · {fr.shell.mySpace}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{isOwner ? fr.shell.roleOwner : fr.shell.roleStaff}</Badge>
            <SignOutButton />
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-3xl gap-1 overflow-x-auto px-4 pb-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="shrink-0 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
