"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { fr } from "@/i18n/fr";
import { deliveryZoneFormSchema } from "@/lib/validation";

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
    throw new Error(data?.error ?? fr.common.error);
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
  const [hours, setHours] = useState<Record<string, string>>(info?.opening_hours ?? {});
  const [address, setAddress] = useState(info?.address ?? "");
  const [rules, setRules] = useState(info?.rules ?? "");
  const [freeText, setFreeText] = useState(info?.free_text ?? "");
  const [zoneForm, setZoneForm] = useState({ neighborhood: "", fee: "" });
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
      setError(err instanceof Error ? err.message : fr.common.error);
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
      setError(parsed.error.issues[0]?.message ?? fr.common.error);
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
      setError(err instanceof Error ? err.message : fr.common.error);
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
      setError(err instanceof Error ? err.message : fr.common.error);
    }
  }

  async function deleteZone(id: string) {
    setError(null);
    try {
      await api(`/api/delivery-zones/${id}`, "DELETE");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{fr.business.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{fr.business.description}</p>
      </div>
      {!canEdit && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm">{fr.common.ownerOnly}</p>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <form onSubmit={saveInfo} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{fr.business.hoursTitle}</CardTitle>
            <CardDescription>{fr.business.hoursHelp}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {DAY_KEYS.map((day, index) => (
              <div key={day} className="space-y-1">
                <Label htmlFor={`day-${day}`}>{fr.business.days[index]}</Label>
                <Input
                  id={`day-${day}`}
                  placeholder={fr.business.dayClosedPlaceholder}
                  value={hours[day] ?? ""}
                  disabled={!canEdit}
                  onChange={(e) => setHours((prev) => ({ ...prev, [day]: e.target.value }))}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <Label htmlFor="address">{fr.business.addressLabel}</Label>
              <Input id="address" placeholder={fr.business.addressPlaceholder} value={address} disabled={!canEdit} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rules">{fr.business.rulesLabel}</Label>
              <Textarea id="rules" placeholder={fr.business.rulesPlaceholder} value={rules} disabled={!canEdit} onChange={(e) => setRules(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="freeText">{fr.business.freeTextLabel}</Label>
              <Textarea id="freeText" placeholder={fr.business.freeTextPlaceholder} value={freeText} disabled={!canEdit} onChange={(e) => setFreeText(e.target.value)} />
            </div>
            {canEdit && (
              <div className="flex items-center gap-3">
                <Button type="submit" disabled={busy}>{busy ? fr.common.saving : fr.common.save}</Button>
                {saved && <span className="text-sm text-muted-foreground">{fr.common.saved}</span>}
              </div>
            )}
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{fr.business.zonesTitle}</CardTitle>
          <CardDescription>{fr.business.zonesHelp}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {zones.length === 0 && <p className="text-sm text-muted-foreground">{fr.business.zoneEmpty}</p>}
          <ul className="divide-y">
            {zones.map((zone) => (
              <li key={zone.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-medium">{zone.neighborhood}</p>
                  <p className="text-sm text-muted-foreground">
                    {zone.fee_fcfa} {fr.common.currency}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant={zone.is_active ? "default" : "secondary"}>
                    {zone.is_active ? fr.business.active : fr.business.inactive}
                  </Badge>
                  {canEdit && (
                    <>
                      <Switch checked={zone.is_active} onCheckedChange={(v) => toggleZone(zone, v)} aria-label={zone.neighborhood} />
                      <Dialog>
                        <DialogTrigger render={<Button type="button" variant="ghost" size="sm" />}>
                          {fr.common.delete}
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>{fr.business.zoneDeleteTitle}</DialogTitle>
                            <DialogDescription>{fr.business.zoneDeleteBody}</DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose render={<Button type="button" variant="destructive" />}>
                              <span onClick={() => deleteZone(zone.id)}>{fr.common.delete}</span>
                            </DialogClose>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {canEdit && (
            <form onSubmit={addZone} className="grid gap-3 border-t pt-4 sm:grid-cols-[1fr_140px_auto]">
              <div className="space-y-1">
                <Label htmlFor="zone-name">{fr.business.zoneNeighborhood}</Label>
                <Input id="zone-name" placeholder={fr.business.zoneNeighborhoodPlaceholder} value={zoneForm.neighborhood} onChange={(e) => setZoneForm((p) => ({ ...p, neighborhood: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="zone-fee">{fr.business.zoneFee}</Label>
                <Input id="zone-fee" inputMode="numeric" placeholder="500" value={zoneForm.fee} onChange={(e) => setZoneForm((p) => ({ ...p, fee: e.target.value }))} />
              </div>
              <Button type="submit" className="self-end" disabled={busy}>{fr.business.zoneAdd}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
