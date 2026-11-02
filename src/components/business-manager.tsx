"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/context";
import { deliveryZoneFormSchema } from "@/lib/validation";
import { formatFcfa } from "@/lib/format";
import { Store, Clock, MapPin, Plus, Trash2, Check, AlertCircle } from "lucide-react";

export interface BusinessInfoData {
  opening_hours: Record<string, string>;
  address: string | null;
  rules: string | null;
  free_text: string | null;
}

export interface ZoneData {
  id: string;
  neighborhood: string;
  fee_fcfa: number;
  is_active: boolean;
}

const DAY_KEYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

async function api(path: string, method: string, body?: unknown): Promise<void> {
  const response = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Une erreur est survenue.");
  }
}

export function BusinessManager({
  info,
  zones,
  canEdit,
}: {
  info: BusinessInfoData | null;
  zones: ZoneData[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { t } = useI18n();

  const [hours, setHours] = useState<Record<string, string>>(info?.opening_hours ?? {});
  const [address, setAddress] = useState(info?.address ?? "");
  const [rules, setRules] = useState(info?.rules ?? "");
  const [freeText, setFreeText] = useState(info?.free_text ?? "");
  const [zoneForm, setZoneForm] = useState({ neighborhood: "", fee: "" });
  const [deletingZone, setDeletingZone] = useState<ZoneData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  async function saveInfo(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const cleaned: Record<string, string> = {};
      for (const [day, value] of Object.entries(hours)) {
        if (value.trim()) cleaned[day] = value.trim();
      }
      await api("/api/business-info", "PATCH", {
        openingHours: cleaned,
        address: address.trim() || null,
        rules: rules.trim() || null,
        freeText: freeText.trim() || null,
      });
      setSaved(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function addZone(event: React.FormEvent) {
    event.preventDefault();
    const parsed = deliveryZoneFormSchema.safeParse({
      neighborhood: zoneForm.neighborhood,
      feeFcfa: zoneForm.fee,
      isActive: true,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.common.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api("/api/delivery-zones", "POST", {
        neighborhood: parsed.data.neighborhood,
        feeFcfa: parsed.data.feeFcfa,
        isActive: parsed.data.isActive,
      });
      setZoneForm({ neighborhood: "", fee: "" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function toggleZone(zone: ZoneData, active: boolean) {
    setError(null);
    try {
      await api(`/api/delivery-zones/${zone.id}`, "PATCH", { isActive: active });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  async function deleteZone(id: string) {
    setError(null);
    try {
      await api(`/api/delivery-zones/${id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.common.error);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          {t.business.title}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.business.description}</p>
      </div>

      {!canEdit && (
        <p className="rounded-xl border border-border/80 bg-secondary/50 px-4 py-2.5 text-xs text-muted-foreground">
          {t.common.ownerOnly}
        </p>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={saveInfo} className="space-y-6">
        {/* Horaires d'ouverture */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-5 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
            <Clock className="h-5 w-5 text-[#0ebb7c]" />
            <div>
              <h2 className="font-heading text-lg font-bold text-foreground">
                {t.business.hoursTitle}
              </h2>
              <p className="text-xs text-muted-foreground">{t.business.hoursHelp}</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {DAY_KEYS.map((day, index) => (
              <div key={day} className="space-y-1">
                <Label htmlFor={`day-${day}`} className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.business.days[index]}
                </Label>
                <Input
                  id={`day-${day}`}
                  placeholder={t.business.dayClosedPlaceholder}
                  value={hours[day] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setHours((prev) => ({ ...prev, [day]: e.target.value }))}
                  className="h-10 rounded-xl"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Adresse et Règles */}
        <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-4 shadow-xs">
          <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
            <Store className="h-5 w-5 text-[#0ebb7c]" />
            <h2 className="font-heading text-lg font-bold text-foreground">
              Coordonnées & Règles
            </h2>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="address" className="text-xs font-semibold uppercase text-muted-foreground">
              {t.business.addressLabel}
            </Label>
            <Input
              id="address"
              placeholder={t.business.addressPlaceholder}
              value={address}
              disabled={!canEdit}
              onChange={(e) => setAddress(e.target.value)}
              className="h-10 rounded-xl"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="rules" className="text-xs font-semibold uppercase text-muted-foreground">
              {t.business.rulesLabel}
            </Label>
            <Textarea
              id="rules"
              placeholder={t.business.rulesPlaceholder}
              value={rules}
              disabled={!canEdit}
              onChange={(e) => setRules(e.target.value)}
              className="rounded-xl resize-none text-xs"
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="freeText" className="text-xs font-semibold uppercase text-muted-foreground">
              {t.business.freeTextLabel}
            </Label>
            <Textarea
              id="freeText"
              placeholder={t.business.freeTextPlaceholder}
              value={freeText}
              disabled={!canEdit}
              onChange={(e) => setFreeText(e.target.value)}
              className="rounded-xl resize-none text-xs"
              rows={3}
            />
          </div>

          {canEdit && (
            <div className="flex items-center gap-3 pt-2">
              <Button
                type="submit"
                disabled={busy}
                className="h-10 rounded-xl bg-[#0ebb7c] px-6 text-xs font-bold text-white hover:bg-[#0ca66e]"
              >
                {busy ? t.common.saving : t.common.save}
              </Button>
              {saved && (
                <span className="flex items-center gap-1 text-xs text-[#0ebb7c] font-semibold">
                  <Check className="h-3.5 w-3.5" />
                  <span>{t.common.saved}</span>
                </span>
              )}
            </div>
          )}
        </div>
      </form>

      {/* Zones de livraison */}
      <div className="rounded-3xl border border-border/70 bg-card p-6 sm:p-8 space-y-6 shadow-xs">
        <div className="flex items-center gap-2.5 border-b border-border/60 pb-4">
          <MapPin className="h-5 w-5 text-[#0ebb7c]" />
          <div>
            <h2 className="font-heading text-lg font-bold text-foreground">
              {t.business.zonesTitle}
            </h2>
            <p className="text-xs text-muted-foreground">{t.business.zonesHelp}</p>
          </div>
        </div>

        {canEdit && (
          <form onSubmit={addZone} className="flex flex-wrap items-end gap-3 rounded-2xl bg-secondary/30 p-3.5">
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor="zone-name" className="text-xs font-semibold uppercase text-muted-foreground">
                {t.business.zoneNeighborhood}
              </Label>
              <Input
                id="zone-name"
                required
                placeholder={t.business.zoneNeighborhoodPlaceholder}
                value={zoneForm.neighborhood}
                onChange={(e) => setZoneForm((p) => ({ ...p, neighborhood: e.target.value }))}
                className="h-9 rounded-xl text-xs"
              />
            </div>

            <div className="w-32 space-y-1">
              <Label htmlFor="zone-fee" className="text-xs font-semibold uppercase text-muted-foreground">
                {t.business.zoneFee}
              </Label>
              <Input
                id="zone-fee"
                type="number"
                required
                placeholder="500"
                value={zoneForm.fee}
                onChange={(e) => setZoneForm((p) => ({ ...p, fee: e.target.value }))}
                className="h-9 rounded-xl text-xs font-bold text-[#0ebb7c]"
              />
            </div>

            <Button
              type="submit"
              disabled={busy}
              className="h-9 rounded-xl bg-[#0ebb7c] px-4 text-xs font-bold text-white hover:bg-[#0ca66e]"
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              {t.business.zoneAdd}
            </Button>
          </form>
        )}

        {zones.length === 0 ? (
          <p className="py-4 text-center text-xs text-muted-foreground">{t.business.zoneEmpty}</p>
        ) : (
          <ul className="space-y-2">
            {zones.map((zone) => (
              <li
                key={zone.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card p-3 shadow-xs"
              >
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm text-foreground">{zone.neighborhood}</span>
                  <span className="rounded-full bg-[#0ebb7c]/10 px-2.5 py-0.5 text-xs font-extrabold text-[#0ebb7c]">
                    {formatFcfa(zone.fee_fcfa)}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5">
                    <Switch
                      id={`zone-${zone.id}`}
                      checked={zone.is_active}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => toggleZone(zone, checked)}
                    />
                    <Label htmlFor={`zone-${zone.id}`} className="text-xs text-muted-foreground cursor-pointer">
                      {zone.is_active ? t.business.active : t.business.inactive}
                    </Label>
                  </div>

                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeletingZone(zone)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Dialogue de suppression d'une zone */}
      <Dialog open={Boolean(deletingZone)} onOpenChange={(open) => !open && setDeletingZone(null)}>
        <DialogContent className="rounded-3xl border-border/80 sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">{t.business.zoneDeleteTitle}</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              {t.business.zoneDeleteBody}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletingZone(null)}
              className="rounded-xl text-xs"
            >
              {t.common.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                if (deletingZone) {
                  deleteZone(deletingZone.id);
                  setDeletingZone(null);
                }
              }}
              className="rounded-xl text-xs font-bold"
            >
              {t.common.delete}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
