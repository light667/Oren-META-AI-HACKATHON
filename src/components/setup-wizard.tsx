"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VoiceRecorder } from "@/components/voice-recorder";
import { fr } from "@/i18n/fr";
import {
  emptyDraft,
  mergeDraft,
  missingQuestions,
  type RestaurantDraft,
} from "@/lib/import/draft";

const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

async function postJson(path: string, body: unknown): Promise<Record<string, unknown>> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  if (!response.ok) throw new Error((data?.error as string) ?? fr.common.error);
  return data ?? {};
}

export function SetupWizard({ slug }: { slug: string }) {
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
      setError(err instanceof Error ? err.message : fr.common.error);
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
      if (!response.ok) throw new Error((data?.error as string) ?? fr.common.error);
      setTranscript(String(data?.transcript ?? ""));
      setDraft((prev) =>
        mergeDraft(prev, {
          info: data?.info as RestaurantDraft["info"],
          zones: (data?.zones as RestaurantDraft["zones"]) ?? [],
          uncertainties: (data?.uncertainties as string[]) ?? [],
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
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
      setError(err instanceof Error ? err.message : fr.common.error);
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
      setError(err instanceof Error ? err.message : fr.setup.publishError);
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{fr.setup.title}</h1>
        <p className="mt-1 text-muted-foreground">{fr.setup.intro}</p>
      </div>
      <ol className="flex flex-wrap gap-2" aria-label={fr.setup.navLabel}>
        {[fr.setup.stepImport, fr.setup.stepReview, fr.setup.stepPublish].map((step, i) => (
          <li
            key={step}
            className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
              published || i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {step}
          </li>
        ))}
      </ol>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {published && (
        <Card>
          <CardContent className="space-y-3 pt-6">
            <p className="text-sm">{fr.setup.published}</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" render={<Link href={`/${slug}`} />}>
                {fr.setup.tryAssistant}
              </Button>
              <Button type="button" variant="outline" render={<Link href="/app/menu" />}>
                {fr.setup.goMenu}
              </Button>
              <Button type="button" variant="outline" render={<Link href="/app/lien" />}>
                {fr.nav.linkQr}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{fr.setup.photoTitle}</CardTitle>
          <CardDescription>{fr.setup.photoHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input type="file" accept="image/*" capture="environment" onChange={onPhoto} aria-label={fr.setup.photoButton} />
          {photoUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoUrl} alt={fr.setup.photoTitle} className="max-h-64 rounded-md border object-contain" />
              <Button type="button" onClick={analyzePhoto} disabled={busy !== null}>
                {busy === "photo" ? fr.setup.analyzing : fr.setup.photoAnalyze}
              </Button>
            </>
          )}
          {!photoUrl && <p className="text-sm text-muted-foreground">{fr.setup.noPhotoYet}</p>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{fr.setup.voiceTitle}</CardTitle>
          <CardDescription>{fr.setup.voiceHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <VoiceRecorder onRecorded={analyzeVoice} />
          {busy === "voice" && <p className="text-sm text-muted-foreground">{fr.setup.analyzing}</p>}
          {transcript && (
            <div className="space-y-1">
              <Label>{fr.setup.transcriptLabel}</Label>
              <p className="rounded-md bg-muted px-3 py-2 text-sm">{transcript}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {currentQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>{fr.setup.interviewTitle}</CardTitle>
            <CardDescription>{fr.setup.interviewHelp}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm font-medium">{fr.setup.questions[currentQuestion]}</p>
            <div className="flex gap-2">
              <Input
                value={answers[currentQuestion] ?? ""}
                onChange={(e) => setAnswers((prev) => ({ ...prev, [currentQuestion]: e.target.value }))}
                placeholder={fr.setup.answerPlaceholder}
                aria-label={fr.setup.answerPlaceholder}
              />
              <Button type="button" onClick={sendAnswer} disabled={busy !== null}>
                {busy === "interview" ? fr.setup.analyzing : fr.setup.answerSend}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{fr.setup.reviewTitle}</CardTitle>
          <CardDescription>{fr.setup.reviewHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {draft.items.length === 0 && draft.zones.length === 0 && (
            <p className="text-sm text-muted-foreground">{fr.setup.draftEmpty}</p>
          )}

          <div className="space-y-3">
            {draft.items.map((item, index) => (
              <div key={index} className="space-y-2 rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <Input
                    value={item.name}
                    onChange={(e) => updateItem(index, { name: e.target.value })}
                    aria-label={fr.menu.nameLabel}
                  />
                  {item.uncertain && <Badge variant="destructive">{fr.setup.uncertainBadge}</Badge>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={item.category}
                    onChange={(e) => updateItem(index, { category: e.target.value })}
                    aria-label={fr.menu.categoryLabel}
                  />
                  <Input
                    inputMode="numeric"
                    placeholder={fr.setup.priceUnknown}
                    value={item.priceFcfa ?? ""}
                    onChange={(e) => {
                      const digits = e.target.value.replace(/\D/g, "");
                      updateItem(index, {
                        priceFcfa: digits ? Number(digits) : null,
                        uncertain: digits ? item.uncertain && item.confidence < 0.75 : true,
                      });
                    }}
                    aria-label={fr.menu.priceLabel}
                  />
                </div>
                <Input
                  value={item.description ?? ""}
                  onChange={(e) => updateItem(index, { description: e.target.value || null })}
                  aria-label={fr.menu.descriptionLabel}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => removeItem(index)}>
                  {fr.common.delete}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  items: [...prev.items, { name: "", description: null, category: "divers", priceFcfa: null, confidence: 1, uncertain: true }],
                }))
              }
            >
              {fr.menu.addItem}
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DAY_KEYS.map((day, i) => (
              <div key={day} className="space-y-1">
                <Label htmlFor={`setup-day-${day}`}>{fr.business.days[i]}</Label>
                <Input
                  id={`setup-day-${day}`}
                  value={draft.info.openingHours[day] ?? ""}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      info: { ...prev.info, openingHours: { ...prev.info.openingHours, [day]: e.target.value } },
                    }))
                  }
                />
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="setup-address">{fr.business.addressLabel}</Label>
              <Input id="setup-address" value={draft.info.address ?? ""} onChange={(e) => setDraft((p) => ({ ...p, info: { ...p.info, address: e.target.value || null } }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="setup-rules">{fr.business.rulesLabel}</Label>
              <Textarea id="setup-rules" value={draft.info.rules ?? ""} onChange={(e) => setDraft((p) => ({ ...p, info: { ...p.info, rules: e.target.value || null } }))} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="setup-free">{fr.business.freeTextLabel}</Label>
              <Textarea id="setup-free" value={draft.info.freeText ?? ""} onChange={(e) => setDraft((p) => ({ ...p, info: { ...p.info, freeText: e.target.value || null } }))} />
            </div>
          </div>

          <div className="space-y-3">
            {draft.zones.map((zone, index) => (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <Input
                  value={zone.neighborhood}
                  onChange={(e) => updateZone(index, { neighborhood: e.target.value })}
                  aria-label={fr.business.zoneNeighborhood}
                  className="min-w-36 flex-1"
                />
                <Input
                  inputMode="numeric"
                  value={zone.feeFcfa ?? ""}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/\D/g, "");
                    updateZone(index, { feeFcfa: digits ? Number(digits) : null });
                  }}
                  aria-label={fr.business.zoneFee}
                  className="w-28"
                />
                {zone.uncertain && <Badge variant="destructive">{fr.setup.uncertainBadge}</Badge>}
                <Button type="button" variant="ghost" size="sm" onClick={() => removeZone(index)}>
                  {fr.common.delete}
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setDraft((prev) => ({
                  ...prev,
                  zones: [...prev.zones, { neighborhood: "", feeFcfa: null, uncertain: true }],
                }))
              }
            >
              {fr.business.zoneAdd}
            </Button>
          </div>

          <Button type="button" onClick={publish} disabled={busy !== null || published} className="w-full sm:w-auto">
            {busy === "publish" ? fr.setup.analyzing : fr.setup.publish}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
