"use client";

import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { useI18n } from "@/i18n/context";
import { MessageSquare, ArrowRight, Sparkles } from "lucide-react";

/** En-tête public moderne (style startup américaine, glassmorphism, responsive). */
export function PublicHeader() {
  const { t } = useI18n();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl transition-colors">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* Logo */}
        <Link
          href="/"
          aria-label={t.nav.home}
          className="shrink-0 transition-transform hover:scale-[1.02] active:scale-95"
        >
          <Logo markClassName="h-7 w-7 text-[#0ebb7c]" wordmarkClassName="font-heading text-xl font-extrabold tracking-tight text-foreground" />
        </Link>

        {/* Navigation centrale */}
        <nav
          className="hidden items-center gap-7 text-sm font-medium text-muted-foreground md:flex"
          aria-label="Navigation principale"
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
            className="group relative inline-flex h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-xs transition-all duration-200 hover:opacity-90 hover:shadow-md hover:shadow-primary/20 active:scale-95 sm:h-10 sm:px-5 sm:text-sm"
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
    <footer className="border-t border-border/60 bg-secondary/30 transition-colors">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 py-12 sm:px-6">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-center">
          <div className="space-y-3">
            <Logo
              markClassName="h-7 w-7 text-[#0ebb7c]"
              wordmarkClassName="font-heading text-xl font-extrabold tracking-tight text-foreground"
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
            <a
              className="inline-flex items-center gap-1.5 rounded-full border border-[#25d366]/40 bg-[#25d366]/10 px-3.5 py-1.5 text-xs font-semibold text-[#25d366] transition-colors hover:bg-[#25d366]/20"
              href="https://wa.me/22870703111"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              <span>{t.landing.footerContact}</span>
            </a>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-border/40 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>© 2026 Oren. Tous droits réservés.</p>
          <div className="flex items-center gap-3">
            <LanguageToggle />
          </div>
        </div>
      </div>
    </footer>
  );
}
