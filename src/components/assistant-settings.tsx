"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/i18n/context";
import { Bot, Power, Clock, Check, AlertCircle } from "lucide-react";

/** Coupe-assistant entreprise + délai d'alerte e-mail (owner uniquement). */
export function AssistantSettings({
  initialEnabled,
  initialDelayMinutes,
  canEdit,
}: {
  initialEnabled: boolean;
  initialDelayMinutes: number;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();

  const [enabled, setEnabled] = useState(initialEnabled);
  const [confirmCut, setConfirmCut] = useState(false);
  const [delay, setDelay] = useState(String(initialDelayMinutes));
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function patch(body: Record<string, unknown>) {
    const response = await fetch("/api/business-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(t.common.error);
  }

  async function toggle(value: boolean) {
    setEnabled(value);
    setError(null);
    try {
      await patch({ assistantEnabled: value });
      router.refresh();
    } catch (err) {
      setEnabled(!value);
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  async function saveDelay(event: React.FormEvent) {
    event.preventDefault();
    const minutes = Number(delay);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      setError(t.common.error);
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await patch({ alertDelayMinutes: minutes });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-6 shadow-xs">
      <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0ebb7c]/10 text-[#0ebb7c]">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t.settings.assistantTitle}
            </h2>
            <p className="text-xs text-muted-foreground">
              {enabled ? t.settings.assistantOn : t.settings.assistantOff}
            </p>
          </div>
        </div>

        <span
          className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            enabled
              ? "bg-[#0ebb7c]/15 text-[#0ebb7c]"
              : "bg-destructive/15 text-destructive"
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-[#0ebb7c] animate-pulse" : "bg-destructive"}`} />
          <span>{enabled ? "Actif" : "Coupé"}</span>
        </span>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Interrupteur Couper l'assistant */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-secondary/30 p-4">
        <div className="space-y-0.5">
          <Label htmlFor="assistant-toggle" className="text-sm font-semibold text-foreground cursor-pointer">
            {t.settings.assistantToggle}
          </Label>
          <p className="text-xs text-muted-foreground">
            Basculez pour suspendre les réponses IA et forcer la reprise humaine.
          </p>
        </div>

        <Switch
          id="assistant-toggle"
          checked={!enabled}
          disabled={!canEdit}
          onCheckedChange={(cut) => (cut ? setConfirmCut(true) : void toggle(true))}
        />
      </div>

      {/* Formulaire délai d'alerte de secours */}
      {canEdit && (
        <form onSubmit={saveDelay} className="space-y-3 pt-2 border-t border-border/50">
          <div className="space-y-1.5">
            <Label htmlFor="alert-delay" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t.settings.alertDelayLabel}
            </Label>
            <div className="flex max-w-xs gap-2">
              <Input
                id="alert-delay"
                type="number"
                min={1}
                max={120}
                value={delay}
                onChange={(e) => setDelay(e.target.value)}
                className="h-10 rounded-xl"
              />
              <Button
                type="submit"
                disabled={busy}
                className="h-10 rounded-xl bg-[#0ebb7c] text-xs font-bold text-white hover:bg-[#0ca66e]"
              >
                {busy ? t.common.saving : t.common.save}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{t.settings.alertDelayHelp}</p>
          </div>
          {saved && (
            <p className="flex items-center gap-1 text-xs text-[#0ebb7c] font-semibold">
              <Check className="h-3.5 w-3.5" />
              <span>{t.settings.saved}</span>
            </p>
          )}
        </form>
      )}

      {/* Confirmation de coupure */}
      <Dialog open={confirmCut} onOpenChange={setConfirmCut}>
        <DialogContent className="rounded-3xl border-border/80">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">{t.settings.cutConfirmTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed pt-1">
              {t.settings.cutConfirmBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmCut(false)}
              className="rounded-xl text-xs"
            >
              {t.settings.cutCancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                setConfirmCut(false);
                void toggle(false);
              }}
              className="rounded-xl text-xs font-bold"
            >
              {t.settings.cutConfirmOk}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
