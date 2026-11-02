"use client";

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
  ArrowRight,
  Mic,
  Zap,
  CheckCircle,
  Clock,
  HelpCircle,
  Store,
  ChevronDown,
} from "lucide-react";
import dynamic from "next/dynamic";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicFooter, PublicHeader } from "@/components/public-chrome";
import { useI18n } from "@/i18n/context";

// Téléphone de démonstration chargé dynamiquement
const DemoPhone = dynamic(
  () => import("@/components/demo-phone-mount").then((m) => m.DemoPhoneMount),
  {
    loading: () => (
      <div
        className="mx-auto h-[520px] w-full max-w-[340px] rounded-[2.6rem] border border-border/80 bg-card/50 backdrop-blur-md"
        aria-hidden
      />
    ),
  },
);

const STEP_ICONS = [Camera, BadgeCheck, Link2];
const BENEFIT_ICONS = [Smartphone, Sparkles, Hand, Wallet];

export default function Home() {
  const { t } = useI18n();

  return (
    <div className="flex min-h-full flex-1 flex-col bg-background text-foreground antialiased selection:bg-[#0ebb7c]/20 selection:text-[#0ebb7c]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: t.app.title,
            applicationCategory: "BusinessApplication",
            operatingSystem: "Web",
            inLanguage: "fr",
            description: t.app.seo.description,
            url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
          }),
        }}
      />
      <PublicHeader />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 sm:px-6">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
          {/* Lueur d'ambiance vert startup */}
          <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[500px] w-[800px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-gradient-to-tr from-[#0ebb7c]/15 via-emerald-500/5 to-transparent blur-3xl" />

          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-8">
            <div className="space-y-6 lg:col-span-7">

              {/* Titre principal */}
              <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl lg:leading-[1.12]">
                {t.landing.heroPromise.split(",")[0]},{" "}
                <span className="gradient-text-green">
                  {t.landing.heroPromise.split(",")[1] || "jour et nuit."}
                </span>
              </h1>

              {/* Sous-titre */}
              <p className="max-w-xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                {t.landing.heroSub}
              </p>

              {/* Boutons d'action */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/inscription"
                  className="group relative inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0ebb7c] px-7 text-sm font-semibold text-white shadow-lg shadow-[#0ebb7c]/25 transition-all duration-200 hover:bg-[#0ca66e] hover:shadow-xl hover:shadow-[#0ebb7c]/30 active:scale-95 sm:text-base"
                >
                  <span>{t.landing.createAssistant}</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>

                <Link
                  href={`/${t.home.demoSlug}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-border/80 bg-card/60 px-6 text-sm font-semibold text-foreground backdrop-blur-md transition-all duration-200 hover:border-[#0ebb7c]/60 hover:bg-secondary hover:text-[#0ebb7c] active:scale-95 sm:text-base"
                >
                  <span>{t.landing.tryDemo}</span>
                </Link>
              </div>
              
            </div>

            {/* Téléphone interactif */}
            <div className="lg:col-span-5">
              <DemoPhone />
            </div>
          </div>
        </section>

        {/* Section Multimodale : Mise en route en 45 secondes */}
        <section className="relative my-16 rounded-3xl border border-border/80 bg-gradient-to-b from-secondary/40 via-card/60 to-background p-6 sm:p-10 shadow-xs">
          <div className="mb-8 text-center space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              D'une photo de menu papier à un restaurant en ligne en 45 secondes
            </h2>
            <p className="mx-auto max-w-2xl text-sm sm:text-base text-muted-foreground">
              Prenez votre menu en photo, dictez vos règles vocales. L'IA extrait, structure et prépare votre catalogue sans aucune saisie fastidieuse.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Carte 1 */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 transition-all hover:border-[#0ebb7c]/40 hover:shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
                <Camera className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">1. Vision par photo</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Le modèle analyse la carte physique du restaurant : noms de plats, catégories et prix en FCFA. Les ambiguïtés sont signalées pour validation.
              </p>
            </div>

            {/* Carte 2 */}
            <div className="rounded-2xl border border-border/60 bg-card p-5 space-y-3 transition-all hover:border-[#0ebb7c]/40 hover:shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
                <Mic className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base">2. Note vocale naturelle</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Dictez vos horaires et vos quartiers de livraison (Agoè, Bè, Tokoin...). La transcription audio extrait précisément vos paramètres réels.
              </p>
            </div>

            {/* Carte 3 */}
            <div className="rounded-2xl border border-[#0ebb7c]/40 bg-[#0ebb7c]/5 p-5 space-y-3 transition-all hover:shadow-xs">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c] text-white">
                <Clock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-[#0ebb7c]">3. Prêt à vendre : 45.8s</h3>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Vous vérifiez chaque ligne d'un coup d'œil, cliquez sur Publier, et partagez immédiatement votre QR code et lien à vos clients.
              </p>
            </div>
          </div>
        </section>

        {/* Comment ça marche */}
        <section id="comment-ca-marche" className="scroll-mt-24 space-y-8 py-12">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.landing.howTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Une expérience fluide en 3 étapes claires, pour le commerçant comme pour le client.
            </p>
          </div>

          <ol className="grid gap-6 sm:grid-cols-3">
            {t.landing.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] || Camera;
              return (
                <li key={step.title} className="h-full">
                  <Card className="h-full border border-border/70 bg-card/60 backdrop-blur-xs transition-all duration-200 hover:-translate-y-1 hover:border-[#0ebb7c]/50 hover:shadow-md">
                    <CardHeader className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
                          <Icon className="h-6 w-6" aria-hidden />
                        </span>
                        <span className="font-heading text-3xl font-bold text-muted-foreground/30">
                          0{index + 1}
                        </span>
                      </div>
                      <CardTitle className="text-lg font-bold">
                        {step.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {step.body}
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ol>
        </section>

        {/* Bento Grid : Bénéfices & Pourquoi les commerçants l'aiment */}
        <section className="space-y-8 py-12">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.landing.benefitsTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Une technologie robuste conçue spécifiquement pour les réalités du commerce en Afrique francophone.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {t.landing.benefits.map((benefit, index) => {
              return (
                <div
                  key={benefit.title}
                  className="group relative overflow-hidden rounded-3xl border border-border/70 bg-card p-6 sm:p-8 transition-all duration-300 hover:border-[#0ebb7c]/60 hover:shadow-lg hover:shadow-[#0ebb7c]/5"
                >
                  <div className="flex items-start gap-4">
                    
                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-foreground">
                        {benefit.title}
                      </h3>
                      <p className="text-sm sm:text-base leading-relaxed text-muted-foreground">
                        {benefit.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        

        {/* Pour qui */}
        <section id="pour-qui" className="scroll-mt-24 space-y-8 py-12">
          <div className="space-y-3 text-center sm:text-left">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.landing.audienceTitle}
            </h2>
            <p className="text-muted-foreground max-w-xl">
              Une architecture multi-entreprises prête pour tous les métiers de service.
            </p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {t.landing.audience.map((entry) => {
              const isAvailable =
                (entry.status as string) === t.landing.availableNow ||
                (entry.status as string) === "Disponible" ||
                (entry.status as string) === "Available now";
              return (
                <li
                  key={entry.name}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-card p-5 transition-all hover:border-[#0ebb7c]/40"
                >
                  <div className="flex items-center gap-3">
                    <Store className={`h-5 w-5 ${isAvailable ? "text-[#0ebb7c]" : "text-muted-foreground"}`} />
                    <span className="font-semibold text-sm sm:text-base">{entry.name}</span>
                  </div>
                  <span
                    className={
                      isAvailable
                        ? "rounded-full bg-[#0ebb7c]/15 px-3 py-1 text-xs font-bold text-[#0ebb7c]"
                        : "rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground"
                    }
                  >
                    {entry.status}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        {/* Questions fréquentes */}
        <section id="questions" className="scroll-mt-24 space-y-6 py-12 max-w-3xl mx-auto">
          <div className="text-center space-y-3">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {t.landing.faqTitle}
            </h2>
            <p className="text-muted-foreground">
              Des réponses claires et transparentes sur le fonctionnement d'Oren.
            </p>
          </div>

          <div className="space-y-3 pt-4">
            {t.landing.faq.map((entry) => (
              <details
                key={entry.q}
                className="group rounded-2xl border border-border/70 bg-card p-5 transition-all open:border-[#0ebb7c]/40 open:shadow-xs"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold leading-relaxed text-foreground select-none">
                  <span>{entry.q}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-open:rotate-180 group-open:text-[#0ebb7c]" />
                </summary>
                <p className="pt-3 text-sm leading-relaxed text-muted-foreground">
                  {entry.a}
                </p>
              </details>
            ))}
          </div>
        </section>

        {/* Bannière Appel Final Style Startup */}
        <section className="py-16">
          <div className="relative overflow-hidden rounded-[2.5rem] border border-[#0ebb7c]/40 bg-zinc-950 px-6 py-14 text-center text-white shadow-2xl sm:px-12">
            {/* Lueur verte en arrière-plan */}
            <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-[#0ebb7c]/30 via-zinc-950 to-zinc-950" />

            <div className="mx-auto max-w-2xl space-y-6">

              <h2 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
                {t.landing.finalTitle}
              </h2>

              <p className="mx-auto max-w-xl text-base text-zinc-300 leading-relaxed sm:text-lg">
                {t.landing.finalBody}
              </p>

              <div className="flex flex-wrap justify-center gap-4 pt-2">
                <Link
                  href="/inscription"
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#0ebb7c] px-8 text-base font-semibold text-white shadow-lg shadow-[#0ebb7c]/30 transition-all duration-200 hover:bg-[#0ca66e] hover:scale-[1.02] active:scale-95"
                >
                  <span>{t.landing.createAssistant}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href={`/${t.home.demoSlug}`}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md transition-all duration-200 hover:bg-white/20 active:scale-95"
                >
                  <span>{t.landing.tryDemo}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
