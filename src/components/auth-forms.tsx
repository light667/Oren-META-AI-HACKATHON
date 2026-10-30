"use client";

import { useState } from "react";
import Link from "next/link";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fr } from "@/i18n/fr";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation";

function SentCard({ title, body }: { title: string; body: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{body}</CardDescription>
      </CardHeader>
    </Card>
  );
}

export function LoginForm({ showError }: { showError: boolean }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(showError ? fr.auth.callbackError : null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch {
      setError(fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <SentCard title={fr.auth.loginTitle} body={fr.auth.notConfigured} />;
  }
  if (sent) {
    return <SentCard title={fr.auth.linkSentTitle} body={fr.auth.linkSentBody} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr.auth.loginTitle}</CardTitle>
        <CardDescription>{fr.auth.loginBody}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{fr.auth.emailLabel}</Label>
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder={fr.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? fr.common.loading : fr.auth.sendLink}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {fr.auth.noAccount}{" "}
            <Link href="/inscription" className="font-medium text-foreground underline underline-offset-4">
              {fr.auth.signupLink}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export function SignupForm() {
  const [form, setForm] = useState({
    businessName: "",
    slug: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signupSchema.safeParse({ ...form, businessType: "restaurant" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? fr.common.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const supabase = createClient();
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: parsed.data.email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            business_name: parsed.data.businessName,
            business_type: parsed.data.businessType,
            slug: parsed.data.slug,
            phone: parsed.data.phone,
          },
        },
      });
      if (otpError) throw otpError;
      setSent(true);
    } catch {
      setError(fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <SentCard title={fr.auth.signupTitle} body={fr.auth.notConfigured} />;
  }
  if (sent) {
    return <SentCard title={fr.auth.linkSentTitle} body={fr.auth.linkSentBody} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr.auth.signupTitle}</CardTitle>
        <CardDescription>{fr.auth.signupBody}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="businessName">{fr.auth.businessNameLabel}</Label>
            <Input id="businessName" required placeholder={fr.auth.businessNamePlaceholder} value={form.businessName} onChange={set("businessName")} />
          </div>
          <div className="space-y-2">
            <Label>{fr.auth.businessTypeLabel}</Label>
            <Select value="restaurant" disabled>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="restaurant">{fr.auth.businessTypeRestaurant}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slug">{fr.auth.slugLabel}</Label>
            <Input id="slug" required placeholder={fr.auth.slugPlaceholder} value={form.slug} onChange={set("slug")} />
            <p className="text-xs text-muted-foreground">{fr.auth.slugHelp}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{fr.auth.phoneLabel}</Label>
            <Input id="phone" type="tel" required placeholder={fr.auth.phonePlaceholder} value={form.phone} onChange={set("phone")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{fr.auth.emailLabel}</Label>
            <Input id="email" type="email" required autoComplete="email" placeholder={fr.auth.emailPlaceholder} value={form.email} onChange={set("email")} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? fr.common.loading : fr.auth.signupSubmit}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {fr.auth.alreadyAccount}{" "}
            <Link href="/connexion" className="font-medium text-foreground underline underline-offset-4">
              {fr.auth.loginLink}
            </Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
