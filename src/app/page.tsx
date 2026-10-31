import Link from "next/link";
import {
  BadgeCheck,
  Camera,
  Hand,
  Link2,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Wallet,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Téléphone de démonstration chargé à la demande : la page reste légère.
const DemoPhone = dynamic(
  () => import("@/components/demo-phone-mount").then((m) => m.DemoPhoneMount),
  {
    loading: () => (
      <div className="mx-auto h-[500px] w-full max-w-[340px] rounded-[2rem] border bg-card" aria-hidden />
    ),
  },
);
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { fr } from "@/i18n/fr";

const STEP_ICONS = [Camera, BadgeCheck, Link2];
const BENEFIT_ICONS = [Smartphone, Sparkles, Hand, Wallet];

export default function Home() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4">
        {/* Hero */}
        <section className="grid items-center gap-10 py-12 sm:py-16 lg:grid-cols-2">
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
              {fr.landing.heroPromise}
            </h1>
            <p className="max-w-lg text-lg leading-8 text-muted-foreground">{fr.landing.heroSub}</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/inscription"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {fr.landing.createAssistant}
              </Link>
              <Link
                href={`/${fr.home.demoSlug}`}
                className="inline-flex h-12 items-center justify-center rounded-xl border bg-background px-6 text-base font-semibold transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {fr.landing.tryDemo}
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">{fr.home.aiNotice}</p>
          </div>
          <DemoPhone />
        </section>

        {/* Comment Ã§a marche */}
        <section id="comment-ca-marche" className="scroll-mt-24 space-y-8 py-12">
          <h2 className="text-3xl font-bold tracking-tight">{fr.landing.howTitle}</h2>
          <ol className="grid gap-5 sm:grid-cols-3">
            {fr.landing.steps.map((step, index) => {
              const Icon = STEP_ICONS[index];
              return (
                <li key={step.title}>
                  <Card className="h-full shadow-[var(--shadow-soft)]">
                    <CardHeader className="space-y-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                      <CardTitle className="text-lg">
                        {index + 1}. {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="leading-7 text-muted-foreground">{step.body}</p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* BÃ©nÃ©fices */}
        <section className="space-y-8 py-12">
          <h2 className="text-3xl font-bold tracking-tight">{fr.landing.benefitsTitle}</h2>
          <div className="grid gap-5 sm:grid-cols-2">
            {fr.landing.benefits.map((benefit, index) => {
              const Icon = BENEFIT_ICONS[index];
              return (
                <Card key={benefit.title} className="shadow-[var(--shadow-soft)]">
                  <CardHeader className="space-y-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <CardTitle className="text-lg">{benefit.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="leading-7 text-muted-foreground">{benefit.body}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Confiance */}
        <section className="space-y-8 py-12">
          <h2 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            <ShieldCheck className="h-8 w-8 text-primary" aria-hidden />
            {fr.landing.trustTitle}
          </h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {fr.landing.trustItems.map((item) => (
              <div key={item.title} className="space-y-2 rounded-2xl border bg-card p-5">
                <h3 className="font-semibold leading-6">{item.title}</h3>
                <p className="leading-7 text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Pour qui */}
        <section id="pour-qui" className="scroll-mt-24 space-y-8 py-12">
          <h2 className="text-3xl font-bold tracking-tight">{fr.landing.audienceTitle}</h2>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {fr.landing.audience.map((entry) => (
              <li
                key={entry.name}
                className="flex items-center justify-between rounded-2xl border bg-card px-5 py-4"
              >
                <span className="font-semibold">{entry.name}</span>
                <span
                  className={
                    entry.status === fr.landing.availableNow
                      ? "rounded-full bg-[var(--success)]/15 px-2.5 py-1 text-xs font-semibold text-[var(--success)]"
                      : "rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground"
                  }
                >
                  {entry.status}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Questions frÃ©quentes */}
        <section id="questions" className="max-w-3xl scroll-mt-24 space-y-4 py-12">
          <h2 className="text-3xl font-bold tracking-tight">{fr.landing.faqTitle}</h2>
          {fr.landing.faq.map((entry) => (
            <details key={entry.q} className="group rounded-2xl border bg-card px-5 py-4">
              <summary className="cursor-pointer list-none font-semibold leading-6 marker:hidden focus-visible:outline-2">
                {entry.q}
              </summary>
              <p className="pt-2 leading-7 text-muted-foreground">{entry.a}</p>
            </details>
          ))}
        </section>

        {/* Appel final */}
        <section className="py-12">
          <div className="space-y-5 rounded-3xl bg-primary px-6 py-10 text-center text-primary-foreground sm:px-10">
            <h2 className="text-3xl font-bold tracking-tight">{fr.landing.finalTitle}</h2>
            <p className="mx-auto max-w-xl leading-7 opacity-90">{fr.landing.finalBody}</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/inscription"
                className="inline-flex h-12 items-center justify-center rounded-xl bg-background px-6 text-base font-semibold text-foreground transition-colors hover:bg-background/90 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {fr.landing.createAssistant}
              </Link>
              <Link
                href={`/${fr.home.demoSlug}`}
                className="inline-flex h-12 items-center justify-center rounded-xl border border-primary-foreground/40 px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-foreground/10 focus-visible:outline-2 focus-visible:outline-offset-2"
              >
                {fr.landing.tryDemo}
              </Link>
            </div>
          </div>
        </section>
      </main>
      <PublicFooter />
    </div>
  );
}
