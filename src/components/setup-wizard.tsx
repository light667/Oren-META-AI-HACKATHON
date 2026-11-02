"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/voice-recorder";
import { useI18n } from "@/i18n/context";
import {
  emptyDraft,
  mergeDraft,
  missingQuestions,
  type RestaurantDraft,
} from "@/lib/import/draft";
import {
  Sparkles,
  Camera,
  Mic,
  HelpCircle,
  CheckCircle2,
  Trash2,
  Plus,
  ArrowRight,
  AlertTriangle,
  Upload,
  Clock,
  MapPin,
  ExternalLink,
  RotateCcw,
} from "lucide-react";

const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) throw new Error((data?.error as string) ?? "Une erreur est survenue.");
  return data ?? {};
}

export function SetupWizard({ slug }: { slug: string }) {
  const { t } = useI18n();

  const [draft, setDraft] = useState<RestaurantDraft>(emptyDraft);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [published, setPublished] = useState(false);

  const questions = useMemo(() => missingQuestions(draft), [draft]);
  const currentQuestion = questions[0];

  function onPhoto(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotoUrl(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function analyzePhoto() {
    if (!photoUrl) return;
    setBusy("photo");
    setError(null);
    try {
      const result = await postJson("/api/import/menu-photo", { image: photoUrl });
      const items = (result.items as RestaurantDraft["items"]) ?? [];
      const uncertainties = (result.uncertainties as string[]) ?? [];
      setDraft((prev) => mergeDraft(prev, { items, uncertainties }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(null);
    }
  }

  async function analyzeVoice(blob: Blob) {
    setBusy("voice");
    setError(null);
    try {
      const form = new FormData();
      form.append("audio", blob, "voix.wav");
      const response = await fetch("/api/import/voice", { method: "POST", body: form });
      const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
      if (!response.ok) throw new Error((data?.error as string) ?? t.common.error);
      setTranscript(String(data?.transcript ?? ""));
      setDraft((prev) =>
        mergeDraft(prev, {
          info: data?.info as RestaurantDraft["info"],
          zones: (data?.zones as RestaurantDraft["zones"]) ?? [],
          uncertainties: (data?.uncertainties as string[]) ?? [],
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(null);
    }
  }

  async function sendAnswer() {
    if (!currentQuestion) return;
    const answer = (answers[currentQuestion] ?? "").trim();
    if (!answer) return;
    setBusy("interview");
    setError(null);
    try {
      const result = await postJson("/api/import/interview", {
        questionId: currentQuestion,
        answer,
      });
      setDraft((prev) =>
        mergeDraft(prev, {
          info: result.info as RestaurantDraft["info"],
          zones: (result.zones as RestaurantDraft["zones"]) ?? [],
        }),
      );
      setAnswers((prev) => ({ ...prev, [currentQuestion]: "" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(null);
    }
  }

  async function publish() {
    setBusy("publish");
    setError(null);
    try {
      await postJson("/api/import/publish", draft);
      setPublished(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.setup.publishError);
    } finally {
      setBusy(null);
    }
  }

  const updateItem = (index: number, patch: Partial<RestaurantDraft["items"][number]>) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
  const removeItem = (index: number) =>
    setDraft((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  const updateZone = (index: number, patch: Partial<RestaurantDraft["zones"][number]>) =>
    setDraft((prev) => ({
      ...prev,
      zones: prev.zones.map((zone, i) => (i === index ? { ...zone, ...patch } : zone)),
    }));
  const removeZone = (index: number) =>
    setDraft((prev) => ({ ...prev, zones: prev.zones.filter((_, i) => i !== index) }));

  const stepList = [t.setup.stepImport, t.setup.stepReview, t.setup.stepPublish];

  return (
    <div className="space-y-8">
      {/* En-tête */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#0ebb7c]/30 bg-[#0ebb7c]/10 px-3 py-0.5 text-xs font-semibold text-[#0ebb7c]">
          <Sparkles className="h-3.5 w-3.5" />
          <span>Meta Multimodal AI</span>
        </div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.setup.title}
        </h1>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed max-w-2xl">
          {t.setup.intro}
        </p>
      </div>

      {/* Frise d'étapes de mise en route */}
      <ol className="flex flex-wrap gap-2" aria-label={t.setup.navLabel}>
        {stepList.map((step, i) => (
          <li
            key={step}
            className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all ${
              published || i === 0
                ? "bg-[#0ebb7c] text-white shadow-xs"
                : "bg-secondary text-muted-foreground"
            }`}
          >
            {step}
          </li>
        ))}
      </ol>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Bannière de succès après publication */}
      {published && (
        <div className="rounded-3xl border border-[#0ebb7c]/40 bg-[#0ebb7c]/10 p-6 sm:p-8 space-y-4">
          <div className="flex items-center gap-2 text-[#0ebb7c]">
            <CheckCircle2 className="h-6 w-6" />
            <h2 className="font-heading text-xl font-bold">Félicitations ! Votre restaurant est en ligne.</h2>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">{t.setup.published}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href={`/${slug}`}
              target="_blank"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-[#0ebb7c] px-4 text-xs font-bold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e]"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>{t.setup.tryAssistant}</span>
            </Link>
            <Link
              href="/app/menu"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              <span>{t.setup.goMenu}</span>
            </Link>
            <Link
              href="/app/lien"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border/80 bg-card px-4 text-xs font-semibold text-foreground hover:bg-secondary"
            >
              <span>{t.nav.linkQr}</span>
            </Link>
          </div>
        </div>
      )}

      {/* Étape 1 : Photo du Menu */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
            <Camera className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t.setup.photoTitle}
            </h2>
            <p className="text-xs text-muted-foreground">{t.setup.photoHelp}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="cursor-pointer inline-flex h-12 items-center gap-2.5 rounded-2xl border-2 border-dashed border-border/80 bg-secondary/40 px-5 text-sm font-semibold text-foreground hover:bg-secondary hover:border-primary/60 transition-all active:scale-95 shadow-xs">
              <Camera className="h-4 w-4 text-primary" />
              <span>{t.setup.photoButton}</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={onPhoto}
                className="sr-only"
                aria-label={t.setup.photoButton}
              />
            </label>

            {photoUrl && (
              <Button
                type="button"
                onClick={analyzePhoto}
                disabled={busy !== null}
                className="h-12 rounded-2xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
              >
                {busy === "photo" ? (
                  <span className="flex items-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    <span>{t.setup.photoAnalyzing}</span>
                  </span>
                ) : (
                  t.setup.photoAnalyze
                )}
              </Button>
            )}

            {error && busy === null && photoUrl && (
              <Button
                type="button"
                variant="outline"
                onClick={analyzePhoto}
                className="h-12 rounded-2xl border-destructive text-destructive hover:bg-destructive/10 px-4 text-xs font-bold"
              >
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                <span>{t.setup.retry}</span>
              </Button>
            )}
          </div>

          {busy === "photo" && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-primary/30 bg-primary/10 p-3.5 text-xs font-semibold text-primary">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{t.setup.photoAnalyzing}</span>
            </div>
          )}

          {photoUrl && (
            <div className="overflow-hidden rounded-2xl border border-border/80 max-w-sm shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={t.setup.photoTitle} className="max-h-64 w-full object-cover" />
            </div>
          )}

          {!photoUrl && <p className="text-xs text-muted-foreground">{t.setup.noPhotoYet}</p>}
        </div>
      </div>

      {/* Étape 2 : Message vocal */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
            <Mic className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t.setup.voiceTitle}
            </h2>
            <p className="text-xs text-muted-foreground">{t.setup.voiceHelp}</p>
          </div>
        </div>

        <div className="space-y-4">
          <VoiceRecorder onRecorded={analyzeVoice} busy={busy === "voice"} />
          {busy === "voice" && (
            <p className="flex items-center gap-2 text-xs font-semibold text-primary">
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              <span>{t.setup.voiceAnalyzing}</span>
            </p>
          )}

          {transcript && (
            <div className="space-y-1.5 rounded-2xl bg-secondary/40 p-4 border border-border/60">
              <Label className="text-xs font-bold uppercase text-muted-foreground">
                {t.setup.transcriptLabel}
              </Label>
              <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                « {transcript} »
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Questions de clarification interactives */}
      {currentQuestion && (
        <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-3 border-b border-border/60 pb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
              <HelpCircle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                {t.setup.interviewTitle}
              </h2>
              <p className="text-xs text-muted-foreground">{t.setup.interviewHelp}</p>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-bold text-foreground">{t.setup.questions[currentQuestion]}</p>
            <div className="flex gap-2">
              <Input
                value={answers[currentQuestion] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder={t.setup.answerPlaceholder}
                className="h-10 rounded-xl text-xs"
              />
              <Button
                type="button"
                onClick={sendAnswer}
                disabled={busy !== null}
                className="h-10 rounded-xl bg-[#0ebb7c] text-xs font-bold text-white hover:bg-[#0ca66e]"
              >
                {busy === "interview" ? t.setup.analyzing : t.setup.answerSend}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Étape 3 : Tableau de révision avant publication */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-border/60 pb-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t.setup.reviewTitle}
            </h2>
            <p className="text-xs text-muted-foreground">{t.setup.reviewHelp}</p>
          </div>
        </div>

        {draft.items.length === 0 && draft.zones.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">{t.setup.draftEmpty}</p>
        )}

        {/* Plats extraits */}
        {draft.items.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-heading text-sm font-bold uppercase tracking-wider text-muted-foreground">
              Plats du menu ({draft.items.length})
            </h3>

            <div className="space-y-3">
              {draft.items.map((item, index) => (
                <div
                  key={index}
                  className={`rounded-2xl border p-4 space-y-3 transition-all ${
                    item.uncertain
                      ? "border-amber-500/60 bg-amber-500/5 ring-1 ring-amber-500/20"
                      : "border-border/70 bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      placeholder="Nom du plat"
                      className="h-9 font-bold text-sm"
                    />
                    {item.uncertain && (
                      <span className="flex items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                        <AlertTriangle className="h-3 w-3" />
                        {t.setup.uncertainBadge}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={item.category}
                      onChange={(e) => updateItem(index, { category: e.target.value })}
                      placeholder="Catégorie"
                      className="h-9 text-xs"
                    />
                    <Input
                      inputMode="numeric"
                      placeholder={t.setup.priceUnknown}
                      value={item.priceFcfa ?? ""}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, "");
                        updateItem(index, {
                          priceFcfa: digits ? Number(digits) : null,
                          uncertain: digits ? item.uncertain && item.confidence < 0.75 : true,
                        });
                      }}
                      className="h-9 text-xs font-bold text-[#0ebb7c]"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input
                      value={item.description ?? ""}
                      onChange={(e) => updateItem(index, { description: e.target.value || null })}
                      placeholder="Description des ingrédients"
                      className="h-9 text-xs flex-1"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  items: [
                    ...prev.items,
                    { name: "", description: null, category: "divers", priceFcfa: null, confidence: 1, uncertain: true },
                  ],
                }))
              }
              className="h-9 rounded-xl text-xs"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t.menu.addItem}
            </Button>
          </div>
        )}

        {/* Bouton Publier */}
        <div className="pt-4 border-t border-border/60">
          <Button
            type="button"
            onClick={publish}
            disabled={busy !== null || published || draft.items.length === 0}
            className="h-12 w-full sm:w-auto rounded-xl bg-[#0ebb7c] px-8 text-sm font-bold text-white shadow-lg shadow-[#0ebb7c]/20 hover:bg-[#0ca66e] active:scale-95 transition-all"
          >
            {busy === "publish" ? t.setup.analyzing : t.setup.publish}
          </Button>
        </div>
      </div>
    </div>
  );
}
