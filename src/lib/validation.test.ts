import { describe, expect, it } from "vitest";
import {
  feeFcfaFormSchema,
  menuItemFormSchema,
  menuItemSchema,
  priceFcfaFormSchema,
  signupSchema,
} from "./validation";

const baseItem = { name: "Attiéké poulet", category: "attiéké", available: true };

describe("prix FCFA — validation Zod (critère : négatif et décimal refusés)", () => {
  it("refuse un prix négatif, zéro, décimal ou en virgule", () => {
    for (const bad of [-500, -1, 0, 1500.5, 0.99]) {
      const result = menuItemSchema.safeParse({ ...baseItem, priceFcfa: bad });
      expect(result.success, `prix ${bad} accepté à tort`).toBe(false);
    }
    for (const bad of ["-500", "0", "1500.5", "1500,5", "15.00", "abc", "", "2 000"]) {
      const result = menuItemFormSchema.safeParse({ ...baseItem, priceFcfa: bad });
      expect(result.success, `prix formulaire « ${bad} » accepté à tort`).toBe(false);
      expect(priceFcfaFormSchema.safeParse(bad).success).toBe(false);
    }
  });

  it("accepte un prix entier positif et le convertit en nombre", () => {
    expect(menuItemSchema.safeParse({ ...baseItem, priceFcfa: 2000 }).success).toBe(true);
    const form = menuItemFormSchema.safeParse({ ...baseItem, priceFcfa: "2000" });
    expect(form.success).toBe(true);
    if (form.success) expect(form.data.priceFcfa).toBe(2000);
  });

  it("frais de livraison : 0 accepté, négatif et décimal refusés", () => {
    expect(feeFcfaFormSchema.safeParse("0").success).toBe(true);
    expect(feeFcfaFormSchema.safeParse("500").success).toBe(true);
    expect(feeFcfaFormSchema.safeParse("-100").success).toBe(false);
    expect(feeFcfaFormSchema.safeParse("12.5").success).toBe(false);
  });
});

describe("inscription", () => {
  it("valide un restaurant complet et refuse un slug ou un téléphone invalide", () => {
    expect(
      signupSchema.safeParse({
        businessName: "Chez Chef T",
        businessType: "restaurant",
        slug: "chez-chef-t",
        phone: "+228 90 00 00 00",
        email: "patron@exemple.tg",
      }).success,
    ).toBe(true);
    expect(
      signupSchema.safeParse({
        businessName: "Chez Chef T",
        businessType: "restaurant",
        slug: "Chez Chef T!",
        phone: "+228 90 00 00 00",
        email: "patron@exemple.tg",
      }).success,
    ).toBe(false);
    expect(
      signupSchema.safeParse({
        businessName: "Chez Chef T",
        businessType: "restaurant",
        slug: "chez-chef-t",
        phone: "abc",
        email: "patron@exemple.tg",
      }).success,
    ).toBe(false);
  });
});
