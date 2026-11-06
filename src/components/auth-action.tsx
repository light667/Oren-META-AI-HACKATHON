"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Notice, PasswordField, Shell, SubmitButton, useCompleteSignIn } from "@/components/auth-forms";
import { useI18n } from "@/i18n/context";
import { firebaseAuthErrorKey } from "@/lib/auth-error";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";
import { AlertTriangle, KeyRound, Loader2, MailCheck } from "lucide-react";

type View =
  | { kind: "checking" }
  | { kind: "verified"; continuing: boolean }
  | { kind: "reset"; email: string }
  | { kind: "recovered" }
  | { kind: "invalid" };

function Icon({ tone, children }: { tone: "brand" | "warn"; children: React.ReactNode }) {
  return (
    <div
      className={
        tone === "brand"
          ? "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-soft text-brand"
          : "mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600"
      }
    >
      {children}
    </div>
  );
}

/**
 * Page d'action Firebase hébergée par Oren (au lieu de la page Google
 * générique) : vérification d'e-mail, nouveau mot de passe, annulation
 * d'un changement d'adresse. À déclarer dans la console Firebase :
 * Authentication > Templates > « Personnaliser l'URL d'action ».
 */
export function AuthAction({ mode, oobCode }: { mode: string; oobCode: string }) {
  const { t } = useI18n();
  const complete = useCompleteSignIn();
  const router = useRouter();
  const [view, setView] = useState<View>({ kind: "checking" });
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    // Un code d'action ne sert qu'une fois : ne jamais l'appliquer deux fois.
    if (started.current) return;
    started.current = true;
    if (!isFirebaseConfigured || !oobCode) {
      setTimeout(() => setView({ kind: "invalid" }), 0);
      return;
    }
    const auth = getFirebaseAuth();
    (async () => {
      try {
        if (mode === "verifyEmail") {
          await applyActionCode(auth, oobCode);
          await auth.authStateReady();
          const user = auth.currentUser;
          if (user) {
            // Même navigateur : on enchaîne directement vers l'espace.
            setView({ kind: "verified", continuing: true });
            await user.reload();
            const outcome = await complete(user);
            if (!outcome.ok) setView({ kind: "verified", continuing: false });
          } else {
            setView({ kind: "verified", continuing: false });
          }
        } else if (mode === "resetPassword") {
          const email = await verifyPasswordResetCode(auth, oobCode);
          setView({ kind: "reset", email });
        } else if (mode === "recoverEmail") {
          await checkActionCode(auth, oobCode);
          await applyActionCode(auth, oobCode);
          setView({ kind: "recovered" });
        } else {
          setView({ kind: "invalid" });
        }
      } catch {
        setView({ kind: "invalid" });
      }
    })();
  }, [mode, oobCode, complete]);

  async function submitReset(event: React.FormEvent) {
    event.preventDefault();
    if (view.kind !== "reset") return;
    if (password.length < 8) return setError(t.auth.passwordShort);
    setBusy(true);
    setError(null);
    try {
      const auth = getFirebaseAuth();
      await confirmPasswordReset(auth, oobCode, password);
      const cred = await signInWithEmailAndPassword(auth, view.email, password);
      const outcome = await complete(cred.user);
      if (!outcome.ok) router.push("/connexion");
    } catch (err) {
      const key = firebaseAuthErrorKey(err);
      setError(key === "generic" || key === "cancelled" ? t.common.error : t.auth[key]);
      setBusy(false);
    }
  }

  if (view.kind === "checking") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-brand" />
          {t.auth.actionChecking}
        </div>
      </Shell>
    );
  }

  if (view.kind === "verified" || view.kind === "recovered") {
    const body =
      view.kind === "recovered"
        ? t.auth.recoverDone
        : view.continuing
          ? t.auth.actionVerifiedBody
          : t.auth.actionVerifiedOtherDevice;
    return (
      <Shell>
        <Icon tone="brand">
          <MailCheck className="h-7 w-7" />
        </Icon>
        <h1 className="text-center text-2xl font-bold tracking-tight">{t.auth.actionVerifiedTitle}</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">{body}</p>
        {view.kind === "verified" && view.continuing ? (
          <div className="mt-6 flex justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-brand" />
          </div>
        ) : (
          <Link href="/connexion?verifie=1" className={cn(buttonVariants(), "mt-6 h-11 w-full rounded-xl font-semibold")}>
          {t.auth.actionContinue}
        </Link>
        )}
      </Shell>
    );
  }

  if (view.kind === "reset") {
    return (
      <Shell>
        <Icon tone="brand">
          <KeyRound className="h-7 w-7" />
        </Icon>
        <h1 className="text-center text-2xl font-bold tracking-tight">{t.auth.resetTitle}</h1>
        <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
          {t.auth.resetBody.replace("{email}", view.email)}
        </p>
        <form onSubmit={submitReset} className="mt-6 space-y-4">
          <PasswordField
            id="new-password"
            label={t.auth.passwordLabel}
            value={password}
            onChange={setPassword}
            autoComplete="new-password"
          />
          {error && <Notice tone="error">{error}</Notice>}
          <SubmitButton busy={busy}>{t.auth.resetSubmit}</SubmitButton>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <Icon tone="warn">
        <AlertTriangle className="h-7 w-7" />
      </Icon>
      <h1 className="text-center text-2xl font-bold tracking-tight">{t.auth.actionInvalidTitle}</h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-muted-foreground">
        {t.auth.actionInvalidBody}
      </p>
      <Link href="/connexion" className={cn(buttonVariants(), "mt-6 h-11 w-full rounded-xl font-semibold")}>
          {t.auth.loginLink}
        </Link>
    </Shell>
  );
}
