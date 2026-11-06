"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/i18n/context";
import { MessageSquare, ArrowRight } from "lucide-react";

// Année du pied de page, figée au chargement du module (pas de valeur
// instable pendant le rendu, cf. Next.js cacheComponents).
const YEAR = new Date().getFullYear();

// Numéro WhatsApp de contact (chiffres, format wa.me). Absent : lien masqué.
const CONTACT_WHATSAPP = (process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "").replace(/\D/g, "");

/** En-tête public moderne (style startup américaine, glassmorphism, responsive). */
export function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full border-b-2 border-ink bg-background/90 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label={t.nav.home}
          className="shrink-0 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Logo markClassName="h-7 w-7 text-brand" wordmarkClassName="font-heading text-xl font-bold tracking-tight text-foreground" />
        </Link>

        {/* Navigation centrale */}
        <nav
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
          aria-label={t.nav.home}
        >
          <Link
            className="transition-colors hover:text-foreground"
            href="/#comment-ca-marche"
          >
            {t.landing.howLink}
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/#pour-qui"
          >
            {t.landing.audienceLink}
          </Link>
          <Link
            className="transition-colors hover:text-foreground"
            href="/#questions"
          >
            {t.landing.faqLink}
          </Link>
        </nav>

        {/* Actions à droite : sous 640px (mobile), n'affiche QUE "Créer mon assistant" */}
        <div className="flex items-center gap-2.5">
          <LanguageToggle className="hidden sm:inline-flex" />
          <div className="hidden sm:inline-flex">
            <ThemeToggle />
          </div>

          <Link
            href="/connexion"
            className="hidden text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground sm:inline-block px-3 py-2"
          >
            {t.auth.loginLink}
          </Link>

          <Link
            href="/inscription"
            className="hover-press shadow-hard group relative inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border-2 border-ink bg-flame px-3.5 text-xs font-semibold text-white sm:h-10 sm:px-4 sm:text-sm"
          >
            <span>{t.landing.createAssistant}</span>
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Pied de page public moderne. */
export function PublicFooter() {
  const { t } = useI18n();

  return (
    <footer className="border-t-2 border-ink bg-card transition-colors">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="space-y-3">
            <Logo
              markClassName="h-7 w-7 text-brand"
              wordmarkClassName="font-heading text-xl font-bold tracking-tight text-foreground"
            />
            <p className="max-w-md text-sm text-muted-foreground">
              {t.landing.footerRights}
            </p>
            
          </div>

          <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-sm font-medium">
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href={`/${t.home.demoSlug}`}
            >
              {t.landing.tryDemo}
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/inscription"
            >
              {t.landing.createAssistant}
            </Link>
            <Link
              className="text-muted-foreground transition-colors hover:text-foreground"
              href="/connexion"
            >
              {t.home.loginCta}
            </Link>
            {CONTACT_WHATSAPP && (
              <a
                className="inline-flex items-center gap-1.5 rounded-lg border-2 border-[#25d366] px-3.5 py-1.5 text-xs font-semibold text-[#128c4a] transition-colors hover:bg-[#25d366]/20 dark:text-[#25d366]"
                href={`https://wa.me/${CONTACT_WHATSAPP}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                <span>{t.landing.footerContact}</span>
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {YEAR} {t.app.title}. {t.landing.copyright}
          </p>
          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
