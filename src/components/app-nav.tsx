"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ClipboardList,
  Home,
  Link2,
  Menu as MenuIcon,
  MessagesSquare,
  MoreHorizontal,
  Rocket,
  Store,
  Users,
  X,
} from "lucide-react";
import { useI18n } from "@/i18n/context";

interface Props {
  isOwner: boolean;
}

export function DesktopAppNav({ isOwner }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();

  const links = [
    { href: "/app", label: t.nav.dashboard, icon: Home },
    { href: "/app/commandes", label: t.nav.orders, icon: ClipboardList },
    { href: "/app/conversations", label: t.nav.conversations, icon: MessagesSquare },
    { href: "/app/menu", label: t.nav.menu, icon: MenuIcon },
    { href: "/app/entreprise", label: t.nav.business, icon: Store },
    ...(isOwner ? [{ href: "/app/equipe", label: t.nav.team, icon: Users }] : []),
    ...(isOwner ? [{ href: "/app/mise-en-route", label: t.nav.setup, icon: Rocket }] : []),
    { href: "/app/lien", label: t.nav.linkQr, icon: Link2 },
  ];

  return (
    <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3" aria-label="Navigation principale">
      {links.map((link) => {
        const isActive =
          link.href === "/app"
            ? pathname === "/app"
            : pathname.startsWith(link.href);
        const Icon = link.icon;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 transition-colors ${
                isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-foreground"
              }`}
              aria-hidden
            />
            <span className="truncate">{link.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Navigation mobile patron (Tâche D5) :
 * 5 entrées maximum (Accueil, Commandes, Conversations, Menu, Plus).
 * « Plus » ouvre une feuille avec Mon entreprise, Équipe, Mise en route, Mon lien et QR.
 * Libellés complets, sans troncature.
 */
export function MobileBottomNav({ isOwner }: Props) {
  const pathname = usePathname();
  const { t } = useI18n();
  const [openSheet, setOpenSheet] = useState(false);

  const mainLinks = [
    { href: "/app", label: t.nav.dashboard, icon: Home },
    { href: "/app/commandes", label: t.nav.orders, icon: ClipboardList },
    { href: "/app/conversations", label: t.nav.conversations, icon: MessagesSquare },
    { href: "/app/menu", label: t.nav.menu, icon: MenuIcon },
  ];

  const moreLinks = [
    { href: "/app/entreprise", label: t.nav.business, icon: Store },
    ...(isOwner ? [{ href: "/app/equipe", label: t.nav.team, icon: Users }] : []),
    ...(isOwner ? [{ href: "/app/mise-en-route", label: t.nav.setup, icon: Rocket }] : []),
    { href: "/app/lien", label: t.nav.linkQr, icon: Link2 },
  ];

  const isMoreActive = moreLinks.some((l) => pathname.startsWith(l.href));

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex h-16 items-center justify-around border-t border-border/60 bg-background/95 px-1 py-1 backdrop-blur-xl md:hidden"
        aria-label="Navigation mobile"
      >
        {mainLinks.map((link) => {
          const isActive =
            link.href === "/app"
              ? pathname === "/app"
              : pathname.startsWith(link.href);
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition-all ${
                isActive
                  ? "text-primary font-bold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden />
              <span>{link.label}</span>
            </Link>
          );
        })}

        {/* 5ème entrée : Plus */}
        <button
          type="button"
          onClick={() => setOpenSheet(true)}
          className={`flex flex-col items-center justify-center gap-1 rounded-xl px-2 py-1 text-[11px] font-semibold transition-all ${
            isMoreActive
              ? "text-primary font-bold"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-label="Plus d'options"
        >
          <MoreHorizontal className="h-5 w-5" aria-hidden />
          <span>Plus</span>
        </button>
      </nav>

      {/* Feuille du bas pour l'onglet Plus */}
      {openSheet && (
        <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-xs md:hidden">
          <div className="w-full rounded-t-3xl border-t border-border/80 bg-background p-5 shadow-2xl animate-oren-rise space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h2 className="font-heading text-base font-bold text-foreground">Menu et réglages</h2>
              <button
                type="button"
                onClick={() => setOpenSheet(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-1.5 py-1">
              {moreLinks.map((link) => {
                const isActive = pathname.startsWith(link.href);
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpenSheet(false)}
                    className={`flex items-center gap-3.5 rounded-2xl px-4 py-3 text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-primary text-primary-foreground shadow-xs font-bold"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <Icon className="h-5 w-5 shrink-0" aria-hidden />
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
