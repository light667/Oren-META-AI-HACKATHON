"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBag, UtensilsCrossed, X } from "lucide-react";
import type { PublicMenuItem } from "@/components/public-chat";
import { useI18n } from "@/i18n/context";
import { formatFcfa } from "@/lib/format";

/**
 * Menu interactif moderne en cartes (Tâche D5 / docs/DESIGN.md).
 * S'ouvre sous forme de feuille du bas ou modale depuis « Voir le menu ».
 * Totaux et quantités strictement calculés par le code en FCFA.
 */
export function ChatMenu({
  menuItems,
  cart,
  onChangeQty,
  onClear,
  onOrder,
  disableOrder,
  onClose,
}: {
  menuItems: PublicMenuItem[];
  cart: Record<string, number>;
  onChangeQty: (itemId: string, delta: number) => void;
  onClear: () => void;
  onOrder: () => void;
  disableOrder: boolean;
  onClose?: () => void;
}) {
  const { t } = useI18n();
  const [category, setCategory] = useState<string>(t.chat.allCategories);

  const categories = useMemo(
    () => [t.chat.allCategories, ...new Set(menuItems.map((i) => i.category))],
    [menuItems, t.chat.allCategories],
  );

  const visibleItems = menuItems.filter(
    (item) => category === t.chat.allCategories || item.category === category,
  );

  const cartLines = menuItems.filter((item) => (cart[item.id] ?? 0) > 0);
  const cartTotal = cartLines.reduce((sum, i) => sum + i.priceFcfa * (cart[i.id] ?? 0), 0);
  const cartCount = cartLines.reduce((sum, i) => sum + (cart[i.id] ?? 0), 0);

  return (
    <div className="flex flex-col h-full max-h-[85vh]">
      {/* En-tête de la feuille de menu */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 px-1">
        <div className="flex items-center gap-2">
          <UtensilsCrossed className="h-4 w-4 text-primary" />
          <h2 className="font-heading text-base font-bold text-foreground">
            {t.chat.menuTitle}
          </h2>
          {menuItems.length > 0 && (
            <span className="text-xs text-muted-foreground">
              ({menuItems.length} plat{menuItems.length > 1 ? "s" : ""})
            </span>
          )}
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {menuItems.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          {t.chat.menuEmpty}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {/* Onglets de catégories */}
          <div className="no-scrollbar flex items-center gap-1.5 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`h-7 shrink-0 rounded-full px-3 text-xs font-semibold transition-all ${
                  category === cat
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "border border-border/70 bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
                onClick={() => setCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grille de plats */}
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {visibleItems.map((item) => {
              const qty = cart[item.id] ?? 0;
              return (
                <li
                  key={item.id}
                  className="flex flex-col justify-between rounded-2xl border border-border/70 bg-card p-3 shadow-xs transition-all hover:border-primary/40"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-foreground leading-snug">
                        {item.name}
                      </h3>
                      <span className="shrink-0 text-xs sm:text-sm font-extrabold text-primary">
                        {formatFcfa(item.priceFcfa)}
                      </span>
                    </div>

                    {item.description && (
                      <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">
                        {item.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {item.category}
                    </span>

                    {item.available ? (
                      <div className="flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/30 p-0.5">
                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-95 disabled:opacity-30"
                          onClick={() => onChangeQty(item.id, -1)}
                          disabled={qty === 0}
                          aria-label={`${t.chat.removeLabel} ${item.name}`}
                        >
                          <Minus className="h-3 w-3" />
                        </button>

                        <span
                          className={`min-w-5 text-center text-xs font-bold ${
                            qty > 0 ? "text-primary font-extrabold" : "text-muted-foreground"
                          }`}
                        >
                          {qty}
                        </span>

                        <button
                          type="button"
                          className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground shadow-xs hover:opacity-90 active:scale-95"
                          onClick={() => onChangeQty(item.id, 1)}
                          aria-label={`${t.chat.addLabel} ${item.name}`}
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                        {t.menu.unavailable}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Barre de Panier dans la modale */}
      {cartCount > 0 && (
        <div className="border-t border-border/60 pt-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <ShoppingBag className="h-3.5 w-3.5" />
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-[9px] font-extrabold text-background">
                {cartCount}
              </span>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Total calculé</p>
              <p className="text-xs sm:text-sm font-extrabold text-foreground">{formatFcfa(cartTotal)}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-2 py-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={onClear}
            >
              {t.chat.cartClear}
            </button>
            <button
              type="button"
              className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-4 text-xs font-bold text-primary-foreground shadow-xs hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
              onClick={() => {
                onOrder();
                if (onClose) onClose();
              }}
              disabled={disableOrder}
            >
              {t.chat.cartOrder}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
