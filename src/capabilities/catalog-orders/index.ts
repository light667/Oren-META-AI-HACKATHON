import { z } from "zod";
import { fr } from "@/i18n/fr";
import type { Capability, ToolSpec } from "@/core/tool-registry";
import { ToolRefusal } from "@/core/tool-registry";
import { confirmOrder, prepareOrder } from "./order-service";

/**
 * Capacité catalog_orders : catalogue + commandes.
 * Chaque outil déclare son schéma Zod, son accès (lecture/écriture)
 * et si une confirmation explicite est requise. Les prix éventuellement
 * présents dans les arguments du modèle sont écartés par les schémas :
 * seuls plat + quantité entrent, le code recalcule tout.
 */

const listMenuSpec: ToolSpec = {
  name: "list_menu",
  description: fr.assistant.tools.list_menu,
  access: "read",
  requiresConfirmation: false,
  inputSchema: z.object({
    category: z.string().trim().min(1).optional(),
  }),
  handler: async (ctx, args) => {
    const { category } = args as { category?: string };
    const items = await ctx.store.listMenuItems(ctx.business.id);
    const filtered = category
      ? items.filter((i) => i.category.toLowerCase() === category.toLowerCase())
      : items;
    return {
      ok: true,
      items: filtered.map((i) => ({
        id: i.id,
        name: i.name,
        description: i.description,
        category: i.category,
        priceFcfa: i.priceFcfa,
        available: i.available,
      })),
    };
  },
};

const getInfoSpec: ToolSpec = {
  name: "get_info",
  description: fr.assistant.tools.get_info,
  access: "read",
  requiresConfirmation: false,
  inputSchema: z.object({
    topic: z.enum(["hours", "address", "rules", "general"]).default("general"),
  }),
  handler: async (ctx, args) => {
    const { topic } = args as { topic: "hours" | "address" | "rules" | "general" };
    const info = await ctx.store.getBusinessInfo(ctx.business.id);
    if (!info) return { ok: true, info: null };
    if (topic === "hours") return { ok: true, openingHours: info.openingHours };
    if (topic === "address") return { ok: true, address: info.address };
    if (topic === "rules") return { ok: true, rules: info.rules };
    return {
      ok: true,
      openingHours: info.openingHours,
      address: info.address,
      rules: info.rules,
      freeText: info.freeText,
    };
  },
};

const prepareOrderSpec: ToolSpec = {
  name: "prepare_order",
  description: fr.assistant.tools.prepare_order,
  access: "write",
  // Écriture préparatoire : crée un brouillon chiffré, confirmé ensuite.
  requiresConfirmation: true,
  inputSchema: z.object({
    items: z
      .array(
        z.object({
          menuItemId: z.string().min(1),
          quantity: z.number().int().min(1).max(99),
        }),
      )
      .min(1)
      .max(50),
    deliveryZone: z.string().trim().min(1).nullable().optional(),
  }),
  handler: async (ctx, args) => {
    const input = args as {
      items: { menuItemId: string; quantity: number }[];
      deliveryZone?: string | null;
    };
    return prepareOrder(ctx.store, ctx.business, {
      items: input.items,
      deliveryZone: input.deliveryZone ?? null,
      sessionId: ctx.session.id,
      conversationId: ctx.conversation.id,
      customerId: ctx.session.customerId,
    });
  },
};

const confirmOrderSpec: ToolSpec = {
  name: "confirm_order",
  description: fr.assistant.tools.confirm_order,
  access: "write",
  requiresConfirmation: false,
  inputSchema: z.object({
    token: z.string().min(1),
  }),
  handler: async (ctx, args) => {
    const { token } = args as { token: string };
    return confirmOrder(ctx.store, ctx.business, {
      token,
      conversationId: ctx.conversation.id,
      sessionId: ctx.session.id,
    });
  },
};

const handoffSpec: ToolSpec = {
  name: "handoff_to_human",
  description: fr.assistant.tools.handoff_to_human,
  access: "write",
  requiresConfirmation: false,
  inputSchema: z.object({
    summary: z.string().trim().min(1).max(2000),
    reason: z.string().trim().max(500).optional(),
  }),
  handler: async (ctx, args) => {
    const { summary, reason } = args as { summary: string; reason?: string };
    await ctx.store.updateConversation(ctx.conversation.id, {
      status: "a_reprendre",
      assistantPaused: true,
    });
    await ctx.store.addMessage({
      businessId: ctx.business.id,
      conversationId: ctx.conversation.id,
      senderRole: "system",
      content: summary,
    });
    return { ok: true, handedToHuman: true, summary, reason: reason ?? null };
  },
};

export const catalogOrdersTools: ToolSpec[] = [
  listMenuSpec,
  getInfoSpec,
  prepareOrderSpec,
  confirmOrderSpec,
  handoffSpec,
];

export const catalogOrdersCapability: Capability = {
  id: "catalog_orders",
  tools: catalogOrdersTools,
};

export { ToolRefusal };
