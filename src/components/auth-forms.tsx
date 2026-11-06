"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
} from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useI18n, type Translations } from "@/i18n/context";
import { firebaseAuthErrorKey } from "@/lib/auth-error";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { signupSchema } from "@/lib/validation";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  Mail,
  MailCheck,
  RefreshCw,
} from "lucide-react";

type SignupMeta = { businessName: string; businessType: "restaurant"; slug: string; phone: string };

const SIGNUP_KEY = (email: string) => `oren-signup:${email.trim().toLowerCase()}`;

function saveSignupMeta(email: string, meta: SignupMeta) {
  try {
    localStorage.setItem(SIGNUP_KEY(email), JSON.stringify(meta));
  } catch {
    // stockage indisponible : /bienvenue redemandera ces informations
  }
}

function loadSignupMeta(email: string | null): SignupMeta | undefined {
  if (!email) return undefined;
  try {
    const raw = localStorage.getItem(SIGNUP_KEY(email));
    return raw ? (JSON.parse(raw) as SignupMeta) : undefined;
  } catch {
    return undefined;
  }
}

function clearSignupMeta(email: string | null) {
  if (!email) return;
  try {
    localStorage.removeItem(SIGNUP_KEY(email));
  } catch {
    // rien
  }
}

function errorText(t: Translations, error: unknown): string | null {
  const key = firebaseAuthErrorKey(error);
  if (key === "cancelled") return null;
  if (key === "generic") return t.common.error;
  return t.auth[key];
}

function verificationSettings() {
  return { url: `${window.location.origin}/connexion?verifie=1` };
}

async function sendVerification(user: FirebaseUser) {
  try {
    await sendEmailVerification(user, verificationSettings());
  } catch (error) {
    // Domaine non autorisé pour l'URL de retour : envoi sans retour.
    const code = (error as { code?: string })?.code ?? "";
    if (code.includes("continue-uri") || code.includes("unauthorized")) {
      await sendEmailVerification(user);
    } else {
      throw error;
    }
  }
}

type SessionOutcome = { ok: true } | { ok: false; unverified?: boolean; message?: string };

/** Échange la connexion Firebase contre la session Supabase, puis redirige. */
function useCompleteSignIn() {
  const router = useRouter();
  return useCallback(
    async (user: FirebaseUser): Promise<SessionOutcome> => {
      const idToken = await user.getIdToken(true);
      const response = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken, signup: loadSignupMeta(user.email) }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        redirect?: string;
        error?: string;
        code?: string;
      };
      if (response.status === 403 && body.code === "email_not_verified") {
        return { ok: false, unverified: true };
      }
      if (!response.ok || !body.redirect) return { ok: false, message: body.error };
      clearSignupMeta(user.email);
      router.replace(body.redirect);
      router.refresh();
      return { ok: true };
    },
    [router],
  );
}

/* ------------------------------------------------------------------ */
/* Éléments partagés                                                   */
/* ------------------------------------------------------------------ */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative rounded-3xl border border-border/70 bg-card/90 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl sm:p-8">
      {children}
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={
        tone === "error"
          ? "flex items-start gap-2 rounded-xl bg-destructive/10 p-3 text-xs leading-relaxed text-destructive"
          : "flex items-start gap-2 rounded-xl bg-primary/10 p-3 text-xs leading-relaxed text-primary"
      }
    >
      <Icon className="mt-px h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}

function SubmitButton({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <Button
      type="submit"
      disabled={busy}
      className="h-11 w-full rounded-xl font-semibold shadow-md shadow-primary/20 transition-all active:scale-[0.98]"
    >
      {busy ? (
        <span className="flex items-center gap-2">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span>{t.common.loading}</span>
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          {children}
          <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </Button>
  );
}

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: React.ReactNode }) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-semibold text-muted-foreground">
      {children}
    </Label>
  );
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete={autoComplete}
          placeholder={t.auth.passwordPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl pl-10 pr-11"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t.auth.hidePassword : t.auth.showPassword}
          className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

function EmailField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <FieldLabel htmlFor="email">{t.auth.emailLabel}</FieldLabel>
      <div className="relative">
        <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          placeholder={t.auth.emailPlaceholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-11 rounded-xl pl-10"
        />
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
      <path fill="#34A853" d="M3.5 7.5l3.2 2.3C7.6 7.9 9.6 6.4 12 6.4c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.4 14.6 2.4 12 2.4 8.3 2.4 5.1 4.5 3.5 7.5z" opacity=".9" />
      <path fill="#FBBC05" d="M12 21.6c2.5 0 4.7-.8 6.3-2.3l-2.9-2.4c-.8.6-1.9 1.1-3.4 1.1-3.7 0-5.3-2.5-5.6-3.8l-3.2 2.5c1.6 3.1 4.9 4.9 8.8 4.9z" />
      <path fill="#4285F4" d="M21.2 10.6H12v3.9h5.5c-.3 1.3-1.1 2.3-2.1 3l2.9 2.4c1.7-1.6 2.9-4 2.9-7.3 0-.6-.1-1.4-.2-2z" />
    </svg>
  );
}

function GoogleButton({
  onUser,
  onError,
  disabled,
}: {
  onUser: (user: FirebaseUser) => Promise<void>;
  onError: (message: string | null) => void;
  disabled: boolean;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    onError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const result = await signInWithPopup(getFirebaseAuth(), provider);
      await onUser(result.user);
    } catch (error) {
      onError(errorText(t, error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={run}
        disabled={disabled || busy}
        className="h-11 w-full gap-2 rounded-xl font-semibold"
      >
        {busy ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          <GoogleIcon />
        )}
        {t.auth.google}
      </Button>
      <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        {t.auth.or}
        <span className="h-px flex-1 bg-border" />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Vérification de l'e-mail                                            */
/* ------------------------------------------------------------------ */

function VerifyEmailCard({ user, onBack }: { user: FirebaseUser; onBack: () => void }) {
  const { t } = useI18n();
  const complete = useCompleteSignIn();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  const check = useCallback(
    async (manual: boolean) => {
      await user.reload();
      if (!user.emailVerified) {
        if (manual) setNotice({ tone: "error", text: t.auth.verifyPending });
        return false;
      }
      const outcome = await complete(user);
      if (!outcome.ok && manual) {
        setNotice({ tone: "error", text: outcome.message ?? t.common.error });
      }
      return outcome.ok;
    },
    [user, complete, t],
  );

  // Détection automatique : dès que le lien est cliqué (autre onglet,
  // téléphone), la page continue seule.
  useEffect(() => {
    let stopped = false;
    const started = Date.now();
    const timer = setInterval(async () => {
      if (stopped || Date.now() - started > 15 * 60_000) return clearInterval(timer);
      try {
        if (await check(false)) clearInterval(timer);
      } catch {
        // réseau : on réessaiera au prochain passage
      }
    }, 5000);
    return () => {
      stopped = true;
      clearInterval(timer);
    };
  }, [check]);

  async function confirm() {
    setBusy(true);
    setNotice(null);
    try {
      await check(true);
    } catch (error) {
      setNotice({ tone: "error", text: errorText(t, error) ?? t.common.error });
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    setNotice(null);
    try {
      await sendVerification(user);
      setNotice({ tone: "success", text: t.auth.verifyResent });
    } catch (error) {
      setNotice({ tone: "error", text: errorText(t, error) ?? t.common.error });
    }
  }

  return (
    <Shell>
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 className="text-center text-2xl font-bold tracking-tight">{t.auth.verifyTitle}</h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
        {t.auth.verifyBody.replace("{email}", user.email ?? "")}
      </p>
      <div className="mt-6 space-y-3">
        {notice && <Notice tone={notice.tone}>{notice.text}</Notice>}
        <Button
          type="button"
          onClick={confirm}
          disabled={busy}
          className="h-11 w-full rounded-xl font-semibold"
        >
          {busy ? t.common.loading : t.auth.verifyDone}
        </Button>
        <div className="flex items-center justify-between gap-2 text-xs">
          <button
            type="button"
            onClick={resend}
            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            {t.auth.verifyResend}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="text-muted-foreground hover:text-foreground hover:underline"
          >
            {t.auth.verifyBack}
          </button>
        </div>
      </div>
    </Shell>
  );
}

function NotConfigured({ title }: { title: string }) {
  const { t } = useI18n();
  return (
    <Shell>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">{t.auth.notConfigured}</p>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Connexion                                                           */
/* ------------------------------------------------------------------ */

export function LoginForm({ showError, verified }: { showError: boolean; verified?: boolean }) {
  const { t } = useI18n();
  const complete = useCompleteSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(showError ? t.auth.callbackError : null);
  const [info, setInfo] = useState<string | null>(verified ? t.auth.verifiedNotice : null);
  const [pending, setPending] = useState<FirebaseUser | null>(null);

  async function handleUser(user: FirebaseUser) {
    if (!user.emailVerified) {
      setPending(user);
      return;
    }
    const outcome = await complete(user);
    if (!outcome.ok) {
      if (outcome.unverified) setPending(user);
      else setError(outcome.message ?? t.common.error);
    }
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const cred = await signInWithEmailAndPassword(getFirebaseAuth(), email.trim(), password);
      await handleUser(cred.user);
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setError(null);
    setInfo(null);
    if (!email.trim()) {
      setError(t.auth.resetNeedEmail);
      return;
    }
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email.trim(), {
        url: `${window.location.origin}/connexion`,
      }).catch(() => sendPasswordResetEmail(getFirebaseAuth(), email.trim()));
    } catch (err) {
      if (firebaseAuthErrorKey(err) === "rateLimited") return setError(t.auth.rateLimited);
    }
    // Message identique que le compte existe ou non (pas d'énumération).
    setInfo(t.auth.resetSent);
  }

  if (!isFirebaseConfigured) return <NotConfigured title={t.auth.loginTitle} />;
  if (pending) {
    return (
      <VerifyEmailCard
        user={pending}
        onBack={() => {
          void firebaseSignOut(getFirebaseAuth());
          setPending(null);
        }}
      />
    );
  }

  return (
    <Shell>
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">{t.auth.loginTitle}</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{t.auth.loginBody}</p>
      </div>

      <GoogleButton onUser={handleUser} onError={setError} disabled={busy} />

      <form onSubmit={submit} className="space-y-4">
        <EmailField value={email} onChange={setEmail} />
        <PasswordField
          id="password"
          label={t.auth.passwordLabel}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
        />
        <div className="-mt-1 text-right">
          <button
            type="button"
            onClick={reset}
            className="text-xs font-semibold text-primary hover:underline"
          >
            {t.auth.forgotPassword}
          </button>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {info && <Notice tone="success">{info}</Notice>}

        <SubmitButton busy={busy}>{t.auth.loginSubmit}</SubmitButton>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {t.auth.noAccount}{" "}
          <Link href="/inscription" className="font-semibold text-primary hover:underline">
            {t.auth.signupLink}
          </Link>
        </p>
      </form>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/* Inscription                                                         */
/* ------------------------------------------------------------------ */

function toSlug(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function SignupForm({ invitation = false }: { invitation?: boolean }) {
  const { t } = useI18n();
  const complete = useCompleteSignIn();
  const [form, setForm] = useState({ businessName: "", slug: "", phone: "", email: "" });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [slugEdited, setSlugEdited] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<FirebaseUser | null>(null);

  function meta(): SignupMeta | null {
    if (invitation) return null;
    const parsed = signupSchema.safeParse({ ...form, businessType: "restaurant" });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.common.error);
      return null;
    }
    return {
      businessName: parsed.data.businessName,
      businessType: "restaurant",
      slug: parsed.data.slug,
      phone: parsed.data.phone,
    };
  }

  async function handleUser(user: FirebaseUser) {
    if (!user.emailVerified) {
      setPending(user);
      return;
    }
    const outcome = await complete(user);
    if (!outcome.ok) {
      if (outcome.unverified) setPending(user);
      else setError(outcome.message ?? t.common.error);
    }
  }

  async function google(user: FirebaseUser) {
    // Champs entreprise facultatifs ici : /bienvenue les redemandera.
    const parsed = signupSchema.omit({ email: true }).safeParse({ ...form, businessType: "restaurant" });
    if (parsed.success && user.email) saveSignupMeta(user.email, parsed.data);
    await handleUser(user);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    const m = meta();
    if (!invitation && !m) return;
    if (password.length < 8) return setError(t.auth.passwordShort);
    if (password !== confirm) return setError(t.auth.passwordMismatch);
    setBusy(true);
    try {
      const email = form.email.trim().toLowerCase();
      if (m) saveSignupMeta(email, m);
      const cred = await createUserWithEmailAndPassword(getFirebaseAuth(), email, password);
      await sendVerification(cred.user);
      setPending(cred.user);
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  if (!isFirebaseConfigured) return <NotConfigured title={t.auth.signupTitle} />;
  if (pending) {
    return (
      <VerifyEmailCard
        user={pending}
        onBack={() => {
          void firebaseSignOut(getFirebaseAuth());
          setPending(null);
        }}
      />
    );
  }

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (key === "businessName" && !slugEdited) {
      setForm((prev) => ({ ...prev, businessName: val, slug: toSlug(val) }));
    } else {
      setForm((prev) => ({ ...prev, [key]: val }));
    }
  };

  return (
    <Shell>
      <div className="mb-6 space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">
          {invitation ? t.auth.inviteSignupTitle : t.auth.signupTitle}
        </h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {invitation ? t.auth.inviteSignupBody : t.auth.signupBody}
        </p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        {!invitation && (
          <>
            <div className="space-y-2">
              <FieldLabel htmlFor="businessName">{t.auth.businessNameLabel}</FieldLabel>
              <Input
                id="businessName"
                required
                autoComplete="organization"
                placeholder={t.auth.businessNamePlaceholder}
                value={form.businessName}
                onChange={set("businessName")}
                className="h-11 rounded-xl"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <FieldLabel htmlFor="slug">{t.auth.slugLabel}</FieldLabel>
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
                  className="h-11 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="phone">{t.auth.phoneLabel}</FieldLabel>
                <Input
                  id="phone"
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder={t.auth.phonePlaceholder}
                  value={form.phone}
                  onChange={set("phone")}
                  className="h-11 rounded-xl"
                />
              </div>
            </div>
            <p className="-mt-2 text-[11px] leading-relaxed text-muted-foreground">
              {t.auth.slugHelp}
            </p>
            <GoogleButton onUser={google} onError={setError} disabled={busy} />
          </>
        )}

        <EmailField value={form.email} onChange={(v) => setForm((p) => ({ ...p, email: v }))} />
        <PasswordField
          id="password"
          label={t.auth.passwordLabel}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
        />
        <PasswordField
          id="password-confirm"
          label={t.auth.passwordConfirmLabel}
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
        />

        {error && <Notice tone="error">{error}</Notice>}

        <SubmitButton busy={busy}>{t.auth.signupSubmit}</SubmitButton>

        <p className="pt-2 text-center text-xs text-muted-foreground">
          {t.auth.alreadyAccount}{" "}
          <Link href="/connexion" className="font-semibold text-primary hover:underline">
            {t.auth.loginLink}
          </Link>
        </p>
      </form>
    </Shell>
  );
}
