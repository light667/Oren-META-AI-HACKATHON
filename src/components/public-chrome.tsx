import Link from "next/link";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { fr } from "@/i18n/fr";

const primaryLink =
  "inline-flex h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2";
const outlineLink =
  "inline-flex h-11 items-center justify-center rounded-xl border bg-background px-4 text-sm font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2";

/** En-tête public unique (accueil et pages visiteurs). Liens natifs légers. */
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-2 px-4 py-3">
        <Link href="/" aria-label={fr.nav.home} className="shrink-0 rounded-md">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-5 text-sm font-medium md:flex" aria-label="Navigation">
          <Link className="hover:text-primary" href="/#comment-ca-marche">
            {fr.landing.howLink}
          </Link>
          <Link className="hover:text-primary" href="/#pour-qui">
            {fr.landing.audienceLink}
          </Link>
          <Link className="hover:text-primary" href="/#questions">
            {fr.landing.faqLink}
          </Link>
        </nav>
        <div className="flex items-center gap-1.5">
          <Link href={`/${fr.home.demoSlug}`} className={`${outlineLink} hidden sm:inline-flex`}>
            {fr.landing.tryDemo}
          </Link>
          <Link href="/inscription" className={primaryLink}>
            {fr.landing.createAssistant}
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Pied de page public unique. */
export function PublicFooter() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo markClassName="h-7 w-7" wordmarkClassName="font-heading text-xl font-bold lowercase" />
          <p className="text-sm text-muted-foreground">{fr.landing.footerRights}</p>
          <p className="text-sm text-muted-foreground">{fr.home.aiNotice}</p>
        </div>
        <nav className="flex flex-col gap-2 text-sm font-medium" aria-label="Pied de page">
          <Link className="hover:text-primary" href={`/${fr.home.demoSlug}`}>
            {fr.landing.tryDemo}
          </Link>
          <Link className="hover:text-primary" href="/inscription">
            {fr.landing.createAssistant}
          </Link>
          <Link className="hover:text-primary" href="/connexion">
            {fr.home.loginCta}
          </Link>
          <a
            className="hover:text-primary"
            href="https://wa.me/22890000000"
            target="_blank"
            rel="noopener noreferrer"
          >
            {fr.landing.footerContact}
          </a>
        </nav>
      </div>
    </footer>
  );
}
