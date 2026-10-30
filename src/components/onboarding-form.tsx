"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { fr } from "@/i18n/fr";
import { onboardingSchema } from "@/lib/validation";

interface Props {
  initial: { businessName: string; slug: string; phone: string };
  invitedBusiness: boolean;
}

export function OnboardingForm({ initial, invitedBusiness }: Props) {
  const router = useRouter();
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
        setError(parsed.error.issues[0]?.message ?? fr.common.error);
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
      if (!response.ok) throw new Error(data?.error ?? fr.common.error);
      router.push("/app/menu");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
      setBusy(false);
    }
  }

  if (invitedBusiness) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{fr.onboarding.invitedTitle}</CardTitle>
          <CardDescription>{fr.onboarding.invitedBody}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? fr.common.loading : fr.onboarding.invitedSubmit}
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr.onboarding.title}</CardTitle>
        <CardDescription>{fr.onboarding.body}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">{fr.auth.businessNameLabel}</Label>
            <Input id="businessName" required value={form.businessName} onChange={set("businessName")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{fr.auth.slugLabel}</Label>
            <Input id="slug" required value={form.slug} onChange={set("slug")} />
            <p className="text-xs text-muted-foreground">{fr.auth.slugHelp}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{fr.auth.phoneLabel}</Label>
            <Input id="phone" type="tel" required value={form.phone} onChange={set("phone")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? fr.common.loading : fr.onboarding.submit}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
