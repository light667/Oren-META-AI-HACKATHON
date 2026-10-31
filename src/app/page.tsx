import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { fr } from "@/i18n/fr";

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4">
      <header className="flex items-center justify-between py-4">
        <Link href="/" aria-label={fr.nav.home}>
          <Logo />
        </Link>
        <div className="flex items-center gap-1">
          <Button render={<Link href="/connexion" />} variant="ghost">
            {fr.home.loginCta}
          </Button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex flex-col gap-14 py-10 sm:py-14">
        <section className="space-y-5">
          <p className="text-sm font-medium text-muted-foreground">{fr.app.tagline}</p>
          <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            {fr.home.heroTitle}
          </h1>
          <p className="max-w-xl text-lg leading-8 text-muted-foreground">{fr.home.promise}</p>
          <div className="space-y-3 pt-2">
            <Button
              render={<Link href={`/${fr.home.demoSlug}`} />}
              className="h-12 bg-[#00b368] px-6 text-base text-white hover:bg-[#009e5c]"
            >
              {fr.home.demoCta}
            </Button>
            <p className="max-w-md text-sm leading-6 text-muted-foreground">{fr.home.demoNote}</p>
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-xl font-semibold tracking-tight">{fr.home.benefitsTitle}</h2>
          <ol className="space-y-6">
            {fr.home.benefits.map((benefit, index) => (
              <li key={benefit.title} className="flex gap-4">
                <span
                  aria-hidden
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#00b368] text-sm font-semibold text-white"
                >
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <h3 className="font-semibold leading-6">{benefit.title}</h3>
                  <p className="max-w-xl leading-7 text-muted-foreground">{benefit.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="space-y-4 border-t pt-8">
          <h2 className="text-xl font-semibold tracking-tight">{fr.home.ownerTitle}</h2>
          <p className="max-w-xl leading-7 text-muted-foreground">{fr.home.ownerBody}</p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link href="/inscription" />}>{fr.home.signupCta}</Button>
            <Button render={<Link href={`/${fr.home.demoSlug}`} />} variant="outline">
              {fr.home.demoCta}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{fr.home.aiNotice}</p>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t py-5">
        <Logo markClassName="h-6 w-6" wordmarkClassName="text-sm font-semibold" />
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link className="hover:text-foreground" href={`/${fr.home.demoSlug}`}>
            {fr.home.demoCta}
          </Link>
          <Link className="hover:text-foreground" href="/inscription">
            {fr.home.signupCta}
          </Link>
        </nav>
      </footer>
    </div>
  );
}
