"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShoppingBasket } from "lucide-react";
import type { PublicMenuItem } from "@/components/public-chat";
import { fr } from "@/i18n/fr";
import { formatFcfa } from "@/lib/format";

const btnPrimary =
  "inline-flex items-center justify-center rounded-xl bg-primary font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const btnOutline =
  "inline-flex items-center justify-center rounded-xl border bg-background font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";
const btnGhost =
  "inline-flex items-center justify-center rounded-xl font-medium transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2";

/**
 * Menu en cartes + panier flottant, chargé à la demande pour garder
 * la page publique rapide. Le total est calculé par le programme.
 */
export function ChatMenu({
  menuItems,
  cart,
  onChangeQty,
  onClear,
  onOrder,
  disableOrder,
  menuRef,
}: {
  menuItems: PublicMenuItem[];
  cart: Record<string, number>;
  onChangeQty: (itemId: string, delta: number) => void;
  onClear: () => void;
  onOrder: () => void;
  disableOrder: boolean;
  menuRef: React.RefObject<HTMLDivElement | null>;
}) {
  const [category, setCategory] = useState<string>(fr.chat.allCategories);
  const categories = useMemo(
    () => [fr.chat.allCategories, ...new Set(menuItems.map((i) => i.category))],
    [menuItems],
  );
  const visibleItems = menuItems.filter(
    (item) => category === fr.chat.allCategories || item.category === category,
  );
  const cartLines = menuItems.filter((item) => (cart[item.id] ?? 0) > 0);
  const cartTotal = cartLines.reduce((sum, i) => sum + i.priceFcfa * (cart[i.id] ?? 0), 0);
  const cartCount = cartLines.reduce((sum, i) => sum + (cart[i.id] ?? 0), 0);

  return (
    <>
      <section ref={menuRef} className="mb-5 scroll-mt-4">
        <h2 className="font-heading text-lg font-bold">{fr.chat.menuTitle}</h2>
        {menuItems.length === 0 ? (
          <p className="pt-2 text-sm text-muted-foreground">{fr.chat.menuEmpty}</p>
        ) : (
          <>
            <div className="flex gap-2 overflow-x-auto py-3" role="tablist" aria-label={fr.chat.menuTitle}>
              {categories.map((cat) => (
                <button
                  key={cat}
                  role="tab"
                  aria-selected={category === cat}
                  onClick={() => setCategory(cat)}
                  className={`h-9 shrink-0 rounded-full px-3.5 text-sm font-medium ${
                    category === cat ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <ul className="space-y-2.5">
              {visibleItems.map((item) => {
                const qty = cart[item.id] ?? 0;
                return (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 rounded-2xl border bg-card p-3 shadow-[var(--shadow-soft)]"
                  >
                    <span
                      aria-hidden
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 font-heading text-base font-bold text-primary"
                    >
                      {item.name.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">{item.name}</p>
                      {item.description && (
                        <p className="truncate text-xs text-muted-foreground">{item.description}</p>
                      )}
                      <p className="text-sm font-semibold text-primary">{formatFcfa(item.priceFcfa)}</p>
                    </div>
                    {item.available ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          className={`${btnOutline} h-9 w-9`}
                          disabled={qty === 0}
                          onClick={() => onChangeQty(item.id, -1)}
                          aria-label={`${fr.chat.removeLabel} ${item.name}`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold" aria-live="polite">
                          {qty}
                        </span>
                        <button
                          type="button"
                          className={`${btnPrimary} h-9 w-9`}
                          onClick={() => onChangeQty(item.id, 1)}
                          aria-label={`${fr.chat.addLabel} ${item.name}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                        {fr.menu.unavailable}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {cartCount > 0 && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-card px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <ShoppingBasket className="h-5 w-5 text-primary" aria-hidden />
              {cartCount}
            </span>
            <span className="flex-1 text-base font-bold">{formatFcfa(cartTotal)}</span>
            <button type="button" className={`${btnGhost} h-9 px-2 text-sm`} onClick={onClear}>
              {fr.chat.cartClear}
            </button>
            <button
              type="button"
              className={`${btnPrimary} h-11 px-5`}
              onClick={onOrder}
              disabled={disableOrder}
            >
              {fr.chat.cartOrder}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
