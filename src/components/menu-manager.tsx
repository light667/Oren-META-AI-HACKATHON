"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { fr } from "@/i18n/fr";
import { menuItemFormSchema } from "@/lib/validation";

export interface MenuItemData {
  id: string;
  name: string;
  description: string | null;
  price_fcfa: number;
  category: string;
  available: boolean;
}

interface Draft {
  name: string;
  description: string;
  category: string;
  price: string;
  available: boolean;
}

const emptyDraft: Draft = { name: "", description: "", category: "", price: "", available: true };

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

export function MenuManager({ items, canEdit }: { items: MenuItemData[]; canEdit: boolean }) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deactivating, setDeactivating] = useState<MenuItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function openCreate() {
    setEditingId(null);
    setDraft(emptyDraft);
    setError(null);
    setDialogOpen(true);
  }

  function openEdit(item: MenuItemData) {
    setEditingId(item.id);
    setDraft({
      name: item.name,
      description: item.description ?? "",
      category: item.category,
      price: String(item.price_fcfa),
      available: item.available,
    });
    setError(null);
    setDialogOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    // Validation Zod côté client ; le serveur revalide avec le même schéma typé.
    const parsed = menuItemFormSchema.safeParse({
      name: draft.name,
      description: draft.description.trim() || null,
      category: draft.category.trim() || "divers",
      priceFcfa: draft.price,
      available: draft.available,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? fr.common.error);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: parsed.data.name,
        description: parsed.data.description,
        category: parsed.data.category,
        priceFcfa: parsed.data.priceFcfa,
        available: parsed.data.available,
      };
      if (editingId) await api(`/api/menu-items/${editingId}`, "PATCH", payload);
      else await api("/api/menu-items", "POST", payload);
      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    } finally {
      setBusy(false);
    }
  }

  async function setAvailable(item: MenuItemData, available: boolean) {
    setError(null);
    try {
      await api(`/api/menu-items/${item.id}`, "PATCH", { available });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : fr.common.error);
    }
  }

  async function confirmDeactivate() {
    if (!deactivating) return;
    await setAvailable(deactivating, false);
    setDeactivating(null);
  }

  const set = (key: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{fr.menu.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{fr.menu.description}</p>
        </div>
        {canEdit && <Button type="button" onClick={openCreate}>{fr.menu.addItem}</Button>}
      </div>
      {!canEdit && <p className="rounded-md bg-muted px-3 py-2 text-sm">{fr.common.ownerOnly}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">{fr.menu.empty}</CardContent>
        </Card>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id}>
              <Card className={item.available ? "" : "opacity-60"}>
                <CardContent className="space-y-3 pt-6">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">{item.category}</p>
                    </div>
                    <p className="shrink-0 font-semibold">
                      {item.price_fcfa} {fr.common.currency}
                    </p>
                  </div>
                  {item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={item.available ? "default" : "secondary"}>
                      {item.available ? fr.menu.available : fr.menu.unavailable}
                    </Badge>
                    {canEdit && (
                      <>
                        <Button type="button" variant="outline" size="sm" onClick={() => openEdit(item)}>
                          {fr.common.edit}
                        </Button>
                        {item.available ? (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setDeactivating(item)}>
                            {fr.menu.deactivate}
                          </Button>
                        ) : (
                          <Button type="button" variant="ghost" size="sm" onClick={() => setAvailable(item, true)}>
                            {fr.menu.activate}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? fr.menu.editItem : fr.menu.addItem}</DialogTitle>
            <DialogDescription>{fr.menu.priceHelp}</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="item-name">{fr.menu.nameLabel}</Label>
              <Input id="item-name" placeholder={fr.menu.namePlaceholder} value={draft.name} onChange={set("name")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-desc">{fr.menu.descriptionLabel}</Label>
              <Textarea id="item-desc" placeholder={fr.menu.descriptionPlaceholder} value={draft.description} onChange={set("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="item-category">{fr.menu.categoryLabel}</Label>
                <Input id="item-category" placeholder={fr.menu.categoryPlaceholder} value={draft.category} onChange={set("category")} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="item-price">{fr.menu.priceLabel}</Label>
                <Input id="item-price" inputMode="numeric" placeholder={fr.menu.pricePlaceholder} value={draft.price} onChange={set("price")} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={draft.available} onCheckedChange={(v) => setDraft((p) => ({ ...p, available: v }))} id="item-available" />
              <Label htmlFor="item-available">{fr.menu.availableLabel}</Label>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="submit" disabled={busy}>{busy ? fr.common.saving : fr.common.save}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deactivating !== null} onOpenChange={(open) => !open && setDeactivating(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{fr.menu.deactivateTitle}</DialogTitle>
            <DialogDescription>{fr.menu.deactivateBody}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="destructive" onClick={confirmDeactivate}>
              {fr.menu.deactivate}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
