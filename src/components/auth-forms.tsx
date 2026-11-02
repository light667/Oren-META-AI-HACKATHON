"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/i18n/context";
import { createClient, isSupabaseConfigured } from "@/lib/supabase/client";
import { signupSchema } from "@/lib/validation";
import { Mail, ArrowRight, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

function SentCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-card p-8 shadow-xl shadow-primary/5 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <CheckCircle2 className="h-8 w-8" />
      </div>
      <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}

export function LoginForm({ showError }: { showError: boolean }) {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(showError ? t.auth.callbackError : null);
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
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <SentCard title={t.auth.loginTitle} body={t.auth.notConfigured} />;
  }
  if (sent) {
    return <SentCard title={t.auth.linkSentTitle} body={t.auth.linkSentBody} />;
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xl shadow-black/5 backdrop-blur-md">
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.auth.loginTitle}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.auth.loginBody}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.emailLabel}
          </Label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              required
              autoComplete="email"
              placeholder={t.auth.emailPlaceholder}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 rounded-xl pl-10 border-border/80 focus-visible:ring-primary"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{t.common.loading}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>{t.auth.sendLink}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link
            href="/inscription"
            className="font-semibold text-primary hover:underline"
          >
            {t.auth.signupLink}
          </Link>
        </p>
      </form>
    </div>
  );
}

export function SignupForm() {
  const { t } = useI18n();
  const [form, setForm] = useState({
    businessName: "",
    slug: "",
    phone: "",
    email: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [slugEdited, setSlugEdited] = useState(false);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (key === "businessName") {
      if (!slugEdited) {
        const autoSlug = val
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-+|-+$/g, "");
        setForm((prev) => ({ ...prev, businessName: val, slug: autoSlug }));
      } else {
        setForm((prev) => ({ ...prev, businessName: val }));
      }
    } else {
      setForm((prev) => ({ ...prev, [key]: val }));
    }
  };

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = signupSchema.safeParse({ ...form, businessType: "restaurant" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.common.error);
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
      setError(t.common.error);
    } finally {
      setBusy(false);
    }
  }

  if (!isSupabaseConfigured) {
    return <SentCard title={t.auth.signupTitle} body={t.auth.notConfigured} />;
  }
  if (sent) {
    return <SentCard title={t.auth.linkSentTitle} body={t.auth.linkSentBody} />;
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 shadow-xl shadow-black/5 backdrop-blur-md">
      <div className="mb-6 space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-0.5 text-xs font-semibold text-primary">
          <Sparkles className="h-3 w-3" />
          <span>Prêt en 5 minutes</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{t.auth.signupTitle}</h1>
        <p className="text-sm text-muted-foreground leading-relaxed">{t.auth.signupBody}</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="businessName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.businessNameLabel}
          </Label>
          <Input
            id="businessName"
            required
            placeholder={t.auth.businessNamePlaceholder}
            value={form.businessName}
            onChange={set("businessName")}
            className="h-11 rounded-xl border-border/80 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.businessTypeLabel}
          </Label>
          <Select value="restaurant" disabled>
            <SelectTrigger className="h-11 w-full rounded-xl border-border/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="restaurant">{t.auth.businessTypeRestaurant}</SelectItem>
            </SelectContent>
          </Select>
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
              placeholder={t.auth.slugPlaceholder}
              value={form.slug}
              onChange={(e) => {
                const val = e.target.value.toLowerCase();
                setSlugEdited(Boolean(val));
                setForm((p) => ({ ...p, slug: val }));
              }}
              className="h-11 rounded-xl pl-16 border-border/80 focus-visible:ring-primary"
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
            placeholder={t.auth.phonePlaceholder}
            value={form.phone}
            onChange={set("phone")}
            className="h-11 rounded-xl border-border/80 focus-visible:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t.auth.emailLabel}
          </Label>
          <Input
            id="email"
            type="email"
            required
            autoComplete="email"
            placeholder={t.auth.emailPlaceholder}
            value={form.email}
            onChange={set("email")}
            className="h-11 rounded-xl border-border/80 focus-visible:ring-primary"
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
          className="h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:opacity-90 active:scale-95 transition-all"
          disabled={busy}
        >
          {busy ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>{t.common.loading}</span>
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <span>{t.auth.signupSubmit}</span>
              <ArrowRight className="h-4 w-4" />
            </span>
          )}
        </Button>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {t.auth.alreadyAccount}{" "}
          <Link
            href="/connexion"
            className="font-semibold text-primary hover:underline"
          >
            {t.auth.loginLink}
          </Link>
        </p>
      </form>
    </div>
  );
}
