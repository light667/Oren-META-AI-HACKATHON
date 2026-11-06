"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BellRing,
  Camera,
  Check,
  ChevronDown,
  Hand,
  Link2,
  Lock,
  Mic,
  Play,
  ReceiptText,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

const DemoPhone = dynamic(
  () => import("@/components/demo-phone-mount").then((m) => m.DemoPhoneMount),
  {
    loading: () => (
      <div className="mx-auto h-[620px] w-full max-w-[340px] rounded-[3rem] bg-zinc-900/90" aria-hidden />
    ),
  },
);

const STEP_ICONS = [Camera, ReceiptText, Link2];
const FEATURE_ICONS = [Mic, ReceiptText, BellRing, Hand];
const TRUST_ICONS = [ShieldCheck, Lock, Sparkles];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">{children}</p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-3 text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="text-pretty text-base leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}

/** Carte flottante autour du téléphone (grand écran uniquement). */
function FloatCard({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "absolute hidden w-64 rounded-2xl border border-border/70 bg-card/90 p-4 text-left shadow-[0_20px_50px_-24px_rgb(0_0_0/0.35)] backdrop-blur-xl lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

export default function Home() {
  const { t, locale } = useI18n();
  const L = t.landing;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground selection:bg-brand/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: t.app.title,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: locale,
            description: t.app.seo.description,
          }),
        }}
      />
      <PublicHeader />

      <main className="flex-1">
        {/* ------------------------------------------------------------ */}
        {/* Héros : promesse centrée, puis la démo en grand dessous        */}
        {/* ------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(60%_55%_at_50%_0%,color-mix(in_oklab,var(--brand)_22%,transparent),transparent_70%)]"
            aria-hidden
          />
          <div
            className="bg-grid pointer-events-none absolute inset-x-0 top-0 -z-10 h-[640px] [mask-image:radial-gradient(70%_60%_at_50%_0%,#000_30%,transparent_75%)]"
            aria-hidden
          />

          <div className="mx-auto max-w-4xl px-4 pb-14 pt-16 text-center sm:px-6 sm:pt-24">
            <Link
              href={`/${t.home.demoSlug}`}
              className="animate-fade-up group inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/70 py-1 pl-1 pr-3 text-xs font-medium text-muted-foreground backdrop-blur transition-colors hover:border-brand/50 hover:text-foreground"
            >
              <span className="rounded-full bg-brand px-2 py-0.5 text-[11px] font-semibold text-brand-foreground">
                Lomé
              </span>
              {L.heroBadge}
              <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
            </Link>

            <h1
              className="animate-fade-up mt-7 text-balance text-[2.6rem] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-6xl lg:text-7xl"
              style={{ animationDelay: "80ms" }}
            >
              {L.heroTitleA}{" "}
              <span className="text-gradient-brand">{L.heroTitleB}</span>
            </h1>

            <p
              className="animate-fade-up mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "160ms" }}
            >
              {L.heroLead}
            </p>

            <div
              className="animate-fade-up mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href="/inscription"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-foreground px-7 text-sm font-semibold text-background shadow-lg shadow-black/10 transition-all hover:-translate-y-px hover:shadow-xl active:translate-y-0"
              >
                {L.createAssistant}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={`/${t.home.demoSlug}`}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border bg-card/80 px-6 text-sm font-semibold backdrop-blur transition-colors hover:border-brand/60 hover:text-brand"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                {L.tryDemo}
              </Link>
            </div>

            <ul
              className="animate-fade-up mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
              style={{ animationDelay: "320ms" }}
            >
              {L.heroTrust.map((item) => (
                <li key={item} className="inline-flex items-center gap-1.5">
                  <Check className="h-4 w-4 text-brand" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Scène de démonstration : pleine largeur, téléphone centré */}
          <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
            <figure
              className="animate-fade-up frame-gradient relative overflow-hidden rounded-[2rem] bg-gradient-to-b from-card to-secondary/60 px-4 pb-0 pt-10 shadow-[0_50px_100px_-40px_rgb(0_0_0/0.35)] sm:rounded-[2.5rem] sm:pt-14"
              style={{ animationDelay: "380ms" }}
            >
              <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent_85%)]" aria-hidden />
              <div
                className="pointer-events-none absolute left-1/2 top-24 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-brand/25 blur-[90px]"
                aria-hidden
              />

              {/* Barre de « fenêtre » façon vidéo de présentation */}
              <div className="absolute inset-x-0 top-0 flex items-center gap-1.5 px-5 py-4" aria-hidden>
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
                <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-pulse-ring absolute inset-0 rounded-full bg-red-500" />
                    <span className="relative h-1.5 w-1.5 rounded-full bg-red-500" />
                  </span>
                  Live
                </span>
              </div>

              <div className="relative mx-auto flex max-w-5xl justify-center">
                {/* Gauche : ce que voit le patron */}
                <FloatCard className="animate-float left-0 top-16 xl:left-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <BellRing className="h-3.5 w-3.5 text-brand" />
                    {L.stage.ownerLabel}
                  </p>
                  <div className="mt-3 rounded-xl border border-brand/30 bg-brand-soft/60 p-3">
                    <p className="text-sm font-semibold">{L.stage.newOrder}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{L.stage.orderLine}</p>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="text-sm font-bold tabular-nums">{L.stage.orderTotal}</span>
                      <span className="rounded-full bg-brand px-2.5 py-1 text-[11px] font-semibold text-brand-foreground">
                        {L.stage.accept}
                      </span>
                    </div>
                  </div>
                </FloatCard>

                <FloatCard className="animate-float-delayed bottom-24 left-6 w-60 xl:left-14">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <UserRound className="h-3.5 w-3.5 text-brand" />
                    {L.stage.handoffLabel}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed">{L.stage.handoffValue}</p>
                </FloatCard>

                {/* Droite : la mise en route multimodale */}
                <FloatCard className="animate-float-delayed right-0 top-24 xl:right-4">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Camera className="h-3.5 w-3.5 text-brand" />
                    {L.stage.menuLabel}
                  </p>
                  <p className="mt-2 text-2xl font-bold tracking-tight">{L.stage.menuValue}</p>
                  <p className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                    {L.stage.menuNote}
                  </p>
                </FloatCard>

                <FloatCard className="animate-float bottom-28 right-6 w-60 xl:right-14">
                  <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    <Mic className="h-3.5 w-3.5 text-brand" />
                    {L.stage.voiceLabel}
                  </p>
                  <div className="mt-2 flex h-6 items-end gap-[3px]" aria-hidden>
                    {[6, 14, 9, 20, 12, 24, 10, 18, 7, 15, 22, 11, 16, 8, 13].map((h, i) => (
                      <span key={i} className="w-[3px] rounded-full bg-brand/70" style={{ height: h }} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{L.stage.voiceValue}</p>
                </FloatCard>

                {/* Le téléphone, centré, coupé en bas comme une vidéo de présentation */}
                <div className="relative -mb-24 w-full max-w-[340px] sm:-mb-20">
                  <DemoPhone />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-background to-transparent" aria-hidden />
            </figure>
            <figcaption className="mt-5 text-center text-xs text-muted-foreground">
              {L.stageCaption}
            </figcaption>
          </div>
        </section>

        {/* Chiffres clés */}
        <section className="border-y border-border/60 bg-secondary/30">
          <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-px px-4 sm:px-6 lg:grid-cols-4">
            {L.stats.map((stat) => (
              <div key={stat.label} className="px-2 py-8 text-center sm:px-6">
                <dt className="sr-only">{stat.label}</dt>
                <dd className="text-3xl font-extrabold tracking-tight sm:text-4xl">{stat.value}</dd>
                <dd className="mx-auto mt-2 max-w-[14rem] text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  {stat.label}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Fonctionnalités */}
        <section className="mx-auto max-w-6xl space-y-12 px-4 py-24 sm:px-6">
          <SectionHeading eyebrow={L.featuresEyebrow} title={L.featuresTitle} sub={L.featuresSub} />
          <div className="grid gap-4 md:grid-cols-2">
            {L.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Sparkles;
              return (
                <article
                  key={feature.title}
                  className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-7 transition-all duration-300 hover:-translate-y-0.5 hover:border-brand/40 hover:shadow-[0_24px_60px_-30px_rgb(0_0_0/0.3)]"
                >
                  <div
                    className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand/10 opacity-0 blur-2xl transition-opacity duration-500 group-hover:opacity-100"
                    aria-hidden
                  />
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-tight">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment-ca-marche" className="scroll-mt-20 bg-secondary/30 py-24">
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
            <SectionHeading eyebrow={L.stepsEyebrow} title={L.howTitle} sub={L.howSub} />
            <ol className="relative grid gap-6 md:grid-cols-3">
              <div
                className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
                aria-hidden
              />
              {L.steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Sparkles;
                return (
                  <li key={step.title} className="relative text-center">
                    <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card shadow-sm">
                      <Icon className="h-6 w-6 text-brand" />
                      <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background">
                        {index + 1}
                      </span>
                    </div>
                    <h3 className="mt-5 text-base font-semibold">{step.title}</h3>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                      {step.body}
                    </p>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Confiance */}
        <section className="mx-auto max-w-6xl space-y-12 px-4 py-24 sm:px-6">
          <SectionHeading eyebrow={L.trustEyebrow} title={L.trustTitle} />
          <div className="grid gap-4 md:grid-cols-3">
            {L.trustItems.map((item, index) => {
              const Icon = TRUST_ICONS[index] ?? ShieldCheck;
              return (
                <div key={item.title} className="rounded-3xl border border-border/70 bg-card p-6">
                  <Icon className="h-5 w-5 text-brand" />
                  <h3 className="mt-4 font-semibold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Pour qui */}
        <section id="pour-qui" className="scroll-mt-20 border-y border-border/60 bg-secondary/30 py-20">
          <div className="mx-auto max-w-6xl space-y-10 px-4 sm:px-6">
            <SectionHeading eyebrow={L.audienceLink} title={L.audienceTitle} sub={L.audienceSub} />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {L.audience.map((entry) => {
                const available = entry.status === L.availableNow;
                return (
                  <div
                    key={entry.name}
                    className={cn(
                      "flex flex-col items-center gap-3 rounded-2xl border p-6 text-center",
                      available
                        ? "border-brand/40 bg-card shadow-[0_16px_40px_-28px_var(--brand)]"
                        : "border-border/70 bg-card/50",
                    )}
                  >
                    <span className={cn("font-semibold", !available && "text-muted-foreground")}>
                      {entry.name}
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                        available ? "bg-brand text-brand-foreground" : "bg-muted text-muted-foreground",
                      )}
                    >
                      {entry.status}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section id="questions" className="mx-auto max-w-3xl scroll-mt-20 space-y-10 px-4 py-24 sm:px-6">
          <SectionHeading eyebrow={L.faqEyebrow} title={L.faqTitle} sub={L.faqSub} />
          <div className="divide-y divide-border/70 rounded-3xl border border-border/70 bg-card">
            {L.faq.map((entry) => (
              <details key={entry.q} className="group px-6 [&_summary::-webkit-details-marker]:hidden">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium">
                  {entry.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <p className="-mt-1 pb-5 text-sm leading-relaxed text-muted-foreground">{entry.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-zinc-950 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div
              className="pointer-events-none absolute left-1/2 top-0 h-72 w-[36rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0ebb7c]/40 blur-[100px]"
              aria-hidden
            />
            <div className="bg-grid pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(60%_60%_at_50%_0%,#000,transparent)]" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {L.finalTitle}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-pretty text-zinc-400">{L.finalBody}</p>
            <div className="relative mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                href="/inscription"
                className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-white px-7 text-sm font-semibold text-zinc-950 transition-transform hover:-translate-y-px"
              >
                {L.createAssistant}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href={`/${t.home.demoSlug}`}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {L.tryDemo}
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
