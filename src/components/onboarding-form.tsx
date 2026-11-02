"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n } from "@/i18n/context";
import { onboardingSchema } from "@/lib/validation";
import { ArrowRight, Sparkles, AlertCircle } from "lucide-react";

interface Props {
  initial: { businessName: string; slug: string; phone: string };
  invitedBusiness: boolean;
}

export function OnboardingForm({ initial, invitedBusiness }: Props) {
  const router = useRouter();
  const { t } = useI18n();
  const [form, setForm] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    if (!invitedBusiness) {
      const parsed = onboardingSchema.safeParse({ ...form, businessType: "restaurant" });
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? t.common.error);
        setBusy(false);
        return;
      }
    }
    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, businessType: "restaurant" }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? t.common.error);
      router.push("/app/menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
      setBusy(false);
    }
  }

  if (invitedBusiness) {
    return (
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xl shadow-black/5 backdrop-blur-md">
        <div className="mb-6 space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.onboarding.invitedTitle}</h1>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.onboarding.invitedBody}</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <Button
            type="submit"
            className="h-11 w-full rounded-xl bg-[#0ebb7c] font-semibold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e] active:scale-95 transition-all"
            disabled={busy}
          >
            {busy ? t.common.loading : t.onboarding.invitedSubmit}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xl shadow-black/5 backdrop-blur-md">
      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-[#0ebb7c]/30 bg-[#0ebb7c]/10 px-3 py-0.5 text-xs font-semibold text-[#0ebb7c]">
          <Sparkles className="h-3 w-3" />
          <span>Configuration rapide</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.onboarding.title}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.onboarding.body}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.businessNameLabel}
          </Label>
          <Input
            id="businessName"
            required
            value={form.businessName}
            onChange={set("businessName")}
            className="h-11 rounded-xl border-border/80 focus-visible:ring-[#0ebb7c]"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.slugLabel}
          </Label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-xs text-muted-foreground select-none">oren.ai/</span>
            <Input
              id="slug"
              required
              value={form.slug}
              onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value.toLowerCase() }))}
              className="h-11 rounded-xl pl-16 border-border/80 focus-visible:ring-[#0ebb7c]"
            />
          </div>
          <p className="text-xs text-muted-foreground">{t.auth.slugHelp}</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.phoneLabel}
          </Label>
          <Input
            id="phone"
            type="tel"
            required
            value={form.phone}
            onChange={set("phone")}
            className="h-11 rounded-xl border-border/80 focus-visible:ring-[#0ebb7c]"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-[#0ebb7c] font-semibold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e] active:scale-95 transition-all"
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{t.common.loading}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>{t.onboarding.submit}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>
      </form>
    </div>
  );
}
