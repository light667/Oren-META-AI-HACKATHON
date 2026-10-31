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
import { fr } from "@/i18n/fr";

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
    if (!response.ok) throw new Error(fr.common.error);
  }

  async function toggle(value: boolean) {
    setEnabled(value);
    setError(null);
    try {
      await patch({ assistantEnabled: value });
      router.refresh();
    } catch (err) {
      setEnabled(!value);
      setError(err instanceof Error ? err.message : fr.common.error);
    }
  }

  async function saveDelay(event: React.FormEvent) {
    event.preventDefault();
    const minutes = Number(delay);
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 120) {
      setError(fr.common.error);
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
      setError(err instanceof Error ? err.message : fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{fr.settings.assistantTitle}</CardTitle>
        <CardDescription>{enabled ? fr.settings.assistantOn : fr.settings.assistantOff}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-4">
          <Label htmlFor="assistant-toggle">{fr.settings.assistantToggle}</Label>
          <Switch
            id="assistant-toggle"
            checked={!enabled}
            disabled={!canEdit}
            onCheckedChange={(cut) => (cut ? setConfirmCut(true) : void toggle(true))}
          />
        </div>
        <Dialog open={confirmCut} onOpenChange={setConfirmCut}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{fr.settings.cutConfirmTitle}</DialogTitle>
              <DialogDescription>{fr.settings.cutConfirmBody}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmCut(false)}>
                {fr.settings.cutCancel}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={() => {
                  setConfirmCut(false);
                  void toggle(false);
                }}
              >
                {fr.settings.cutConfirmOk}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        <form onSubmit={saveDelay} className="space-y-2">
          <Label htmlFor="alert-delay">{fr.settings.alertDelayLabel}</Label>
          <p className="text-xs text-muted-foreground">{fr.settings.alertDelayHelp}</p>
          <div className="flex items-center gap-3">
            <Input
              id="alert-delay"
              inputMode="numeric"
              className="w-24"
              value={delay}
              disabled={!canEdit}
              onChange={(e) => setDelay(e.target.value)}
            />
            {canEdit && (
              <Button type="submit" disabled={busy} size="sm">
                {busy ? fr.common.saving : fr.common.save}
              </Button>
            )}
            {saved && <span className="text-sm text-muted-foreground">{fr.settings.saved}</span>}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
