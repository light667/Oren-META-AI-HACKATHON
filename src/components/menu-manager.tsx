"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
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
import { Textarea } from "@/components/ui/textarea";
import { useI18n } from "@/i18n/context";
import { menuItemFormSchema } from "@/lib/validation";
import { formatFcfa } from "@/lib/format";
import { Plus, Edit2, AlertCircle, UtensilsCrossed, Check } from "lucide-react";

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
    throw new Error(data?.error ?? "Une erreur est survenue.");
  }
}

export function MenuManager({ items, canEdit }: { items: MenuItemData[]; canEdit: boolean }) {
  const router = useRouter();
  const { t } = useI18n();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [deactivating, setDeactivating] = useState<MenuItemData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("Tous");

  const categories = useMemo(() => {
    return ["Tous", ...new Set(items.map((i) => i.category || "divers"))];
  }, [items]);

  const filteredItems = useMemo(() => {
    if (activeCategory === "Tous") return items;
    return items.filter((i) => (i.category || "divers") === activeCategory);
  }, [items, activeCategory]);

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
    const parsed = menuItemFormSchema.safeParse({
      name: draft.name,
      description: draft.description.trim() || null,
      category: draft.category.trim() || "divers",
      priceFcfa: draft.price,
      available: draft.available,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? t.common.error);
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
      setError(err instanceof Error ? err.message : t.common.error);
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
      setError(err instanceof Error ? err.message : t.common.error);
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
      {/* En-tête */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {t.menu.title}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{t.menu.description}</p>
        </div>

        {canEdit && (
          <Button
            type="button"
            onClick={openCreate}
            className="h-10 rounded-xl bg-[#0ebb7c] px-4 font-bold text-white shadow-md shadow-[#0ebb7c]/20 hover:bg-[#0ca66e] active:scale-95 transition-all"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {t.menu.addItem}
          </Button>
        )}
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

      {/* Catégories de filtres */}
      {items.length > 0 && (
        <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-all ${
                activeCategory === cat
                  ? "bg-[#0ebb7c] text-white shadow-xs"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80 hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Grille des plats */}
      {items.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border/80 bg-card/30 p-12 text-center">
          <UtensilsCrossed className="mx-auto h-8 w-8 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">{t.menu.empty}</p>
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <li key={item.id}>
              <div
                className={`flex h-full flex-col justify-between rounded-2xl border bg-card p-4 shadow-xs transition-all duration-200 hover:shadow-md ${
                  item.available ? "border-border/80" : "border-border/40 opacity-60"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0ebb7c]/10 font-heading text-base font-bold text-[#0ebb7c]">
                      {item.name.charAt(0).toUpperCase()}
                    </span>
                    <p className="font-extrabold text-base text-[#0ebb7c]">
                      {formatFcfa(item.price_fcfa)}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-bold text-sm text-foreground truncate">{item.name}</h3>
                    <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                      {item.category}
                    </p>
                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      id={`avail-${item.id}`}
                      checked={item.available}
                      disabled={!canEdit}
                      onCheckedChange={(checked) => setAvailable(item, checked)}
                    />
                    <Label
                      htmlFor={`avail-${item.id}`}
                      className="text-xs font-semibold text-muted-foreground cursor-pointer"
                    >
                      {item.available ? t.menu.available : t.menu.unavailable}
                    </Label>
                  </div>

                  {canEdit && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(item)}
                      className="h-8 rounded-lg px-2.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <Edit2 className="h-3.5 w-3.5 mr-1" />
                      {t.common.edit}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Dialogue d'ajout / modification de plat */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md border-border/80">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {editingId ? t.menu.editItem : t.menu.addItem}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={submit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="dish-name" className="text-xs font-semibold uppercase text-muted-foreground">
                {t.menu.nameLabel}
              </Label>
              <Input
                id="dish-name"
                required
                placeholder={t.menu.namePlaceholder}
                value={draft.name}
                onChange={set("name")}
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dish-cat" className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.menu.categoryLabel}
                </Label>
                <Input
                  id="dish-cat"
                  placeholder={t.menu.categoryPlaceholder}
                  value={draft.category}
                  onChange={set("category")}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dish-price" className="text-xs font-semibold uppercase text-muted-foreground">
                  {t.menu.priceLabel}
                </Label>
                <Input
                  id="dish-price"
                  type="number"
                  required
                  placeholder={t.menu.pricePlaceholder}
                  value={draft.price}
                  onChange={set("price")}
                  className="h-10 rounded-xl font-bold text-[#0ebb7c]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="dish-desc" className="text-xs font-semibold uppercase text-muted-foreground">
                {t.menu.descriptionLabel}
              </Label>
              <Textarea
                id="dish-desc"
                placeholder={t.menu.descriptionPlaceholder}
                value={draft.description}
                onChange={set("description")}
                className="rounded-xl resize-none text-xs"
                rows={2}
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Switch
                id="dish-avail"
                checked={draft.available}
                onCheckedChange={(val) => setDraft((p) => ({ ...p, available: val }))}
              />
              <Label htmlFor="dish-avail" className="text-xs font-semibold cursor-pointer">
                {t.menu.availableLabel}
              </Label>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="rounded-xl text-xs"
              >
                {t.common.cancel}
              </Button>
              <Button
                type="submit"
                disabled={busy}
                className="rounded-xl bg-[#0ebb7c] text-xs font-bold text-white hover:bg-[#0ca66e]"
              >
                {busy ? t.common.saving : t.common.save}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
