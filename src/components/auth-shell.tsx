import Link from "next/link";
import { Logo } from "@/components/logo";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { fr } from "@/i18n/fr";

const YEAR = new Date().getFullYear();

/** Cadre commun des pages connexion, inscription et bienvenue. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex min-h-dvh flex-col bg-background text-foreground">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(55%_60%_at_50%_0%,color-mix(in_oklab,var(--brand)_18%,transparent),transparent_70%)]"
        aria-hidden
      />
      <div
        className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] [mask-image:radial-gradient(60%_60%_at_50%_0%,#000_20%,transparent_75%)]"
        aria-hidden
      />
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-4 sm:px-6 sm:py-6">
        <Link href="/" aria-label={fr.nav.home} className="transition-opacity hover:opacity-80">
          <Logo
            markClassName="h-7 w-7 text-brand"
            wordmarkClassName="text-xl font-extrabold tracking-tight text-foreground"
          />
        </Link>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        {children}
      </main>
      <footer className="px-4 py-6 text-center text-xs text-muted-foreground">
        © {YEAR} {fr.app.title} · {fr.app.tagline}
      </footer>
    </div>
  );
}
