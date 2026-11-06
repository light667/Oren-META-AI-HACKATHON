"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import {
  ArrowRight,
  BellRing,
  Bot,
  Camera,
  ChevronDown,
  Hand,
  Link2,
  Lock,
  Mic,
  Play,
  ReceiptText,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { Reveal } from "@/components/reveal";
import { useI18n } from "@/i18n/context";
import { cn } from "@/lib/utils";

const DemoPhone = dynamic(
  () => import("@/components/demo-phone-mount").then((m) => m.DemoPhoneMount),
  {
    loading: () => (
      <div className="mx-auto h-[620px] w-full max-w-[340px] rounded-[3rem] bg-ink/90" aria-hidden />
    ),
  },
);

const STEP_ICONS = [Camera, ReceiptText, Link2];
const FEATURE_ICONS = [Mic, ReceiptText, BellRing, Hand];
const TRUST_ICONS = [ShieldCheck, Lock, Bot];

/* Boutons : turquoise = action principale, contour = secondaire */
const ctaClass =
  "hover-press shadow-hard inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-flame px-6 text-sm font-semibold text-white sm:text-base";
const ghostClass =
  "inline-flex h-12 items-center justify-center gap-2 rounded-lg border-2 border-brand bg-card px-6 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:text-base";

function Eyebrow({ children, light }: { children: React.ReactNode; light?: boolean }) {
  return (
    <p
      className={cn(
        "font-mono text-xs font-semibold uppercase tracking-[0.2em]",
        light ? "text-white/85" : "text-flame-strong",
      )}
    >
      {children}
    </p>
  );
}

function SectionHeading({
  eyebrow,
  title,
  sub,
  light,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  light?: boolean;
}) {
  return (
    <div className="mx-auto max-w-2xl space-y-4 text-center">
      <Eyebrow light={light}>{eyebrow}</Eyebrow>
      <h2 className="text-balance text-3xl font-bold tracking-tight sm:text-5xl">{title}</h2>
      {sub && (
        <p
          className={cn(
            "text-pretty text-base leading-relaxed sm:text-lg",
            light ? "text-white/85" : "text-muted-foreground",
          )}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

/** Carte flottante autour du téléphone (grand écran uniquement). */
function FloatCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "shadow-hard absolute hidden w-64 rounded-xl border-2 border-ink bg-card p-4 text-left text-card-foreground lg:block",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardLabel({ icon: Icon, children }: { icon: typeof Camera; children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 font-mono text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      <span className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-soft text-brand">
        <Icon className="h-3.5 w-3.5" />
      </span>
      {children}
    </p>
  );
}

export default function Home() {
  const { t, locale } = useI18n();
  const L = t.landing;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground selection:bg-flame/30">
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
        {/* Héros : promesse en très grand, deux actions, puis la démo */}
        <section className="relative">
          <div className="mx-auto max-w-5xl px-4 pb-12 pt-8 text-center sm:px-6 sm:pt-12">
            <h1
              className="animate-fade-up text-balance text-[2.6rem] font-bold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[5.2rem]"
              style={{ animationDelay: "60ms" }}
            >
              {L.heroTitleA}{" "}
              <span className="relative text-brand">
                {L.heroTitleB}
                <svg
                  className="absolute -bottom-2 left-0 h-3 w-full text-foreground sm:-bottom-3 sm:h-4"
                  viewBox="0 0 300 12"
                  preserveAspectRatio="none"
                  aria-hidden
                >
                  <path d="M2 9 C 80 2, 220 2, 298 7" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" />
                </svg>
              </span>
            </h1>

            <p
              className="animate-fade-up mx-auto mt-7 max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
              style={{ animationDelay: "140ms" }}
            >
              {L.heroLead}
            </p>

            <div
              className="animate-fade-up mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center"
              style={{ animationDelay: "220ms" }}
            >
              <Link href="/inscription" className={ctaClass}>
                {L.createAssistant}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href={`/${t.home.demoSlug}`} className={ghostClass}>
                <Play className="h-3.5 w-3.5 fill-current" />
                {L.tryDemo}
              </Link>
            </div>
          </div>

          {/* Scène de démonstration : aplat carbone, téléphone centré, coupé en bas */}
          <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
            <figure
              className="animate-fade-up shadow-hard-lg relative overflow-hidden rounded-xl border-2 border-ink bg-zinc-900 px-4 pt-10 sm:pt-14"
              style={{ animationDelay: "300ms" }}
            >
              <div
                className="pointer-events-none absolute inset-0 opacity-20 [background-image:radial-gradient(rgb(255_255_255/0.45)_1px,transparent_1px)] [background-size:22px_22px]"
                aria-hidden
              />
              <div className="pointer-events-none absolute -left-10 bottom-10 h-40 w-40 rotate-12 rounded-xl bg-flame" aria-hidden />
              <div className="pointer-events-none absolute -right-8 top-8 h-28 w-28 rounded-full border-[10px] border-white/15" aria-hidden />

              <div className="relative mx-auto flex max-w-5xl justify-center">
                <FloatCard className="animate-float left-0 top-12 xl:left-4">
                  <CardLabel icon={BellRing}>{L.stage.ownerLabel}</CardLabel>
                  <p className="mt-3 font-heading text-base font-bold">{L.stage.newOrder}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{L.stage.orderLine}</p>
                  <div className="mt-3 flex items-center justify-between border-t-2 border-dashed border-border pt-3">
                    <span className="font-heading text-lg font-bold tabular-nums">{L.stage.orderTotal}</span>
                    <span className="rounded-md bg-flame px-3 py-1.5 text-xs font-semibold text-white">
                      {L.stage.accept}
                    </span>
                  </div>
                </FloatCard>

                <FloatCard className="animate-float-delayed bottom-24 left-8 w-60 xl:left-16">
                  <CardLabel icon={UserRound}>{L.stage.handoffLabel}</CardLabel>
                  <p className="mt-2 text-sm leading-relaxed">{L.stage.handoffValue}</p>
                </FloatCard>

                <FloatCard className="animate-float-delayed right-0 top-20 xl:right-4">
                  <CardLabel icon={Camera}>{L.stage.menuLabel}</CardLabel>
                  <p className="mt-2 font-heading text-3xl font-bold tracking-tight">{L.stage.menuValue}</p>
                  <p className="mt-1 text-xs font-semibold text-flame-strong">{L.stage.menuNote}</p>
                </FloatCard>

                <FloatCard className="animate-float bottom-28 right-8 w-60 xl:right-16">
                  <CardLabel icon={Mic}>{L.stage.voiceLabel}</CardLabel>
                  <div className="mt-3 flex h-6 items-end gap-[3px]" aria-hidden>
                    {[6, 14, 9, 20, 12, 24, 10, 18, 7, 15, 22, 11, 16, 8, 13].map((h, i) => (
                      <span key={i} className="w-[3px] rounded-sm bg-brand" style={{ height: h }} />
                    ))}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{L.stage.voiceValue}</p>
                </FloatCard>

                <div className="relative -mb-24 w-full max-w-[340px] sm:-mb-20">
                  <DemoPhone />
                </div>
              </div>
            </figure>
            <figcaption className="mt-5 text-center font-mono text-xs text-muted-foreground">
              {L.stageCaption}
            </figcaption>
          </div>
        </section>

        {/* Fonctionnalités : cartes franches, ombre signature */}
        <section className="mx-auto max-w-6xl space-y-14 px-4 py-24 sm:px-6">
          <Reveal><SectionHeading eyebrow={L.featuresEyebrow} title={L.featuresTitle} sub={L.featuresSub} /></Reveal>
          <div className="grid gap-6 md:grid-cols-2">
            {L.features.map((feature, index) => {
              const Icon = FEATURE_ICONS[index] ?? Mic;
              const accent = index === 1;
              return (
                <Reveal key={feature.title} delay={index * 90} className="h-full">
                <article
                  className={cn(
                    "hover-press shadow-hard rounded-xl border-2 border-ink p-7",
                    accent ? "bg-zinc-900 text-white" : "bg-card",
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-lg",
                      accent ? "bg-white/15 text-white" : "bg-brand-soft text-brand",
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-bold tracking-tight">{feature.title}</h3>
                  <p
                    className={cn(
                      "mt-2 text-sm leading-relaxed sm:text-base",
                      accent ? "text-white/85" : "text-muted-foreground",
                    )}
                  >
                    {feature.body}
                  </p>
                </article>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Comment ça marche : gris clair */}
        <section id="comment-ca-marche" className="scroll-mt-20 border-y-2 border-ink bg-secondary py-24">
          <div className="mx-auto max-w-6xl space-y-14 px-4 sm:px-6">
            <Reveal><SectionHeading eyebrow={L.stepsEyebrow} title={L.howTitle} sub={L.howSub} /></Reveal>
            <ol className="grid gap-6 md:grid-cols-3">
              {L.steps.map((step, index) => {
                const Icon = STEP_ICONS[index] ?? Camera;
                return (
                  <Reveal
                    as="li"
                    key={step.title}
                    delay={index * 120}
                    className="shadow-hard h-full rounded-xl border-2 border-ink bg-card p-7 text-card-foreground"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-heading text-5xl font-bold leading-none text-brand">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <Icon className="h-7 w-7 text-flame-strong" />
                    </div>
                    <h3 className="mt-6 text-lg font-bold tracking-tight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </Reveal>
                );
              })}
            </ol>
          </div>
        </section>

        {/* Confiance */}
        <section className="mx-auto max-w-6xl space-y-14 px-4 py-24 sm:px-6">
          <Reveal><SectionHeading eyebrow={L.trustEyebrow} title={L.trustTitle} /></Reveal>
          <div className="grid gap-6 md:grid-cols-3">
            {L.trustItems.map((item, index) => {
              const Icon = TRUST_ICONS[index] ?? ShieldCheck;
              return (
                <Reveal key={item.title} delay={index * 90} className="h-full">
                <div className="h-full rounded-xl border-2 border-border bg-card p-7">
                  <Icon className="h-7 w-7 text-brand" />
                  <h3 className="mt-5 text-lg font-bold tracking-tight">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
                </Reveal>
              );
            })}
          </div>
        </section>

        {/* Pour qui */}
        <section id="pour-qui" className="scroll-mt-20 border-y-2 border-ink bg-secondary py-24">
          <div className="mx-auto max-w-6xl space-y-12 px-4 sm:px-6">
            <Reveal><SectionHeading eyebrow={L.audienceLink} title={L.audienceTitle} sub={L.audienceSub} /></Reveal>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {L.audience.map((entry, index) => {
                const available = entry.status === L.availableNow;
                return (
                  <Reveal key={entry.name} delay={index * 80} className="h-full">
                  <div
                    className={cn(
                      "h-full rounded-xl border-2 p-6",
                      available
                        ? "shadow-hard border-ink bg-brand text-brand-foreground"
                        : "border-dashed border-ink/30 bg-card",
                    )}
                  >
                    <p className="font-heading text-xl font-bold">{entry.name}</p>
                    <p
                      className={cn(
                        "mt-2 font-mono text-xs font-semibold uppercase tracking-wider",
                        available ? "opacity-80" : "text-muted-foreground",
                      )}
                    >
                      {entry.status}
                    </p>
                  </div>
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>

        {/* Questions fréquentes */}
        <section id="questions" className="mx-auto max-w-3xl scroll-mt-20 space-y-12 px-4 py-24 sm:px-6">
          <Reveal><SectionHeading eyebrow={L.faqEyebrow} title={L.faqTitle} sub={L.faqSub} /></Reveal>
          <div className="space-y-3">
            {L.faq.map((entry) => (
              <details
                key={entry.q}
                className="group rounded-xl border-2 border-ink bg-card px-6 open:shadow-hard [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-heading text-base font-bold">
                  {entry.q}
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand transition-transform duration-200 group-open:rotate-180">
                    <ChevronDown className="h-4 w-4" />
                  </span>
                </summary>
                <p className="-mt-1 pb-6 text-sm leading-relaxed text-muted-foreground sm:text-base">{entry.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Appel final : aplat carbone + bouton turquoise */}
        <section className="px-4 pb-24 sm:px-6">
          <div className="shadow-hard-lg relative mx-auto max-w-6xl overflow-hidden rounded-xl border-2 border-ink bg-zinc-900 px-6 py-16 text-center text-white sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-12 -top-12 h-48 w-48 rotate-12 rounded-xl bg-flame" aria-hidden />
            <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full border-[14px] border-white/20" aria-hidden />
            <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-bold tracking-tight sm:text-5xl">
              {L.finalTitle}
            </h2>
            <p className="relative mx-auto mt-4 max-w-xl text-pretty opacity-85 sm:text-lg">{L.finalBody}</p>
            <div className="relative mt-10 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:items-center">
              <Link href="/inscription" className={ctaClass}>
                {L.createAssistant}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={`/${t.home.demoSlug}`}
                className="inline-flex h-12 items-center justify-center rounded-lg border-2 border-current px-6 text-sm font-semibold transition-colors hover:bg-white/10 sm:text-base"
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
