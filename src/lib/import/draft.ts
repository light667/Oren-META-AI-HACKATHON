import { z } from "zod";

/**
 * Brouillon de mise en route (photo + voix + interview).
 * Rien de tout ceci n'est publié : la publication repasse par les
 * schémas métier (prix FCFA entier positif, etc.) au moment où le
 * patron clique sur « Publier ». Les lectures incertaines sont
 * signalées, jamais inventées.
 */

export const menuDraftItemSchema = z.object({
  name: z.string(),
  description: z.string().nullable().default(null),
  category: z.string().default("divers"),
  /** null = prix illisible sur la photo, à saisir par le patron. */
  priceFcfa: z.number().int().positive().nullable().default(null),
  confidence: z.number().min(0).max(1).default(0),
  uncertain: z.boolean().default(false),
});
export type MenuDraftItem = z.infer<typeof menuDraftItemSchema>;

export const zoneDraftSchema = z.object({
  neighborhood: z.string(),
  feeFcfa: z.number().int().nonnegative().nullable().default(null),
  uncertain: z.boolean().default(false),
});
export type ZoneDraft = z.infer<typeof zoneDraftSchema>;

export const infoDraftSchema = z.object({
  openingHours: z.record(z.string(), z.string()).default({}),
  address: z.string().nullable().default(null),
  rules: z.string().nullable().default(null),
  freeText: z.string().nullable().default(null),
  groupBookings: z.string().nullable().default(null),
});
export type InfoDraft = z.infer<typeof infoDraftSchema>;

export const restaurantDraftSchema = z.object({
  items: z.array(menuDraftItemSchema).default([]),
  info: infoDraftSchema.default({
    openingHours: {},
    address: null,
    rules: null,
    freeText: null,
    groupBookings: null,
  }),
  zones: z.array(zoneDraftSchema).default([]),
  uncertainties: z.array(z.string()).default([]),
});
export type RestaurantDraft = z.infer<typeof restaurantDraftSchema>;

export const emptyDraft: RestaurantDraft = {
  items: [],
  info: { openingHours: {}, address: null, rules: null, freeText: null, groupBookings: null },
  zones: [],
  uncertainties: [],
};

/** Seuil en dessous duquel une lecture est signalée incertaine. */
export const CONFIDENCE_THRESHOLD = 0.75;

export function flagMenuItem(raw: z.infer<typeof menuDraftItemSchema>): MenuDraftItem {
  const uncertain =
    raw.uncertain || raw.priceFcfa === null || raw.confidence < CONFIDENCE_THRESHOLD;
  return { ...raw, uncertain };
}

export type MissingQuestionId = "hours" | "zones" | "address" | "groupBookings" | "rules";

/**
 * Interview guidée : les questions manquantes sont décidées par le
 * CODE à partir des trous du brouillon, jamais par le modèle.
 */
export function missingQuestions(draft: RestaurantDraft): MissingQuestionId[] {
  const questions: MissingQuestionId[] = [];
  if (Object.keys(draft.info.openingHours).length === 0) questions.push("hours");
  if (draft.zones.length === 0) questions.push("zones");
  if (!draft.info.address) questions.push("address");
  if (!draft.info.groupBookings) questions.push("groupBookings");
  if (!draft.info.rules) questions.push("rules");
  return questions;
}

/** Fusionne un brouillon extrait dans le brouillon courant (le patron garde la main). */
export function mergeDraft(base: RestaurantDraft, patch: Partial<RestaurantDraft>): RestaurantDraft {
  return {
    items: [...base.items, ...(patch.items ?? [])],
    zones: [...base.zones, ...(patch.zones ?? [])],
    info: {
      openingHours: { ...base.info.openingHours, ...(patch.info?.openingHours ?? {}) },
      address: patch.info?.address ?? base.info.address,
      rules: patch.info?.rules ?? base.info.rules,
      freeText: [base.info.freeText, patch.info?.freeText].filter(Boolean).join("\n") || null,
      groupBookings: patch.info?.groupBookings ?? base.info.groupBookings,
    },
    uncertainties: [...new Set([...base.uncertainties, ...(patch.uncertainties ?? [])])],
  };
}
