import { describe, expect, it } from "vitest";
import { menuItemSchema } from "@/lib/validation";
import {
  emptyDraft,
  flagMenuItem,
  mergeDraft,
  missingQuestions,
  type RestaurantDraft,
} from "./draft";

describe("brouillon de mise en route", () => {
  it("signale incertain : prix illisible ou confiance faible", () => {
    expect(
      flagMenuItem({ name: "X", description: null, category: "divers", priceFcfa: null, confidence: 0.99, uncertain: false }).uncertain,
    ).toBe(true);
    expect(
      flagMenuItem({ name: "X", description: null, category: "divers", priceFcfa: 1000, confidence: 0.4, uncertain: false }).uncertain,
    ).toBe(true);
    expect(
      flagMenuItem({ name: "X", description: null, category: "divers", priceFcfa: 1000, confidence: 0.95, uncertain: false }).uncertain,
    ).toBe(false);
  });

  it("les questions manquantes sont décidées par le code, à partir des trous", () => {
    expect(missingQuestions(emptyDraft)).toEqual([
      "hours",
      "zones",
      "address",
      "groupBookings",
      "rules",
    ]);
    const filled: RestaurantDraft = {
      items: [],
      zones: [{ neighborhood: "Agoè", feeFcfa: 500, uncertain: false }],
      info: {
        openingHours: { lundi: "10h-22h" },
        address: "Agoè, Lomé",
        rules: null,
        freeText: null,
        groupBookings: "Jusqu'à 20 personnes",
      },
      uncertainties: [],
    };
    expect(missingQuestions(filled)).toEqual(["rules"]);
  });

  it("la fusion garde ce que le patron avait déjà et ajoute le nouveau", () => {
    const merged = mergeDraft(emptyDraft, {
      items: [{ name: "Attiéké", description: null, category: "divers", priceFcfa: 2000, confidence: 1, uncertain: false }],
      info: { openingHours: { lundi: "10h-22h" }, address: null, rules: null, freeText: null, groupBookings: null },
    });
    expect(merged.items).toHaveLength(1);
    expect(merged.info.openingHours.lundi).toBe("10h-22h");
  });

  it("rien ne se publie avec un prix nul, négatif, décimal ou resté vide", () => {
    for (const price of [null, 0, -500, 1500.5]) {
      expect(
        menuItemSchema.safeParse({ name: "Plat", category: "divers", priceFcfa: price }).success,
        `prix ${price}`,
      ).toBe(false);
    }
    expect(
      menuItemSchema.safeParse({ name: "Plat", category: "divers", priceFcfa: 2000 }).success,
    ).toBe(true);
  });
});
