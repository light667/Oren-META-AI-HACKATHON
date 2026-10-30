import { z } from "zod";
import { fr } from "@/i18n/fr";

/**
 * Validation partagée client + serveur.
 * Règles métier : prix FCFA entiers strictement positifs, jamais de
 * décimaux ni de négatifs (AGENTS.md règles 1 et 10). Le code décide,
 * le modèle propose : ces schémas sont la frontière.
 */

export const slugSchema = z
  .string()
  .trim()
  .min(3, fr.validation.slug)
  .max(60, fr.validation.slug)
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, fr.validation.slug);

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\+?[0-9][0-9\s]{7,19}$/, fr.validation.phone);

export const emailSchema = z.string().trim().email(fr.validation.email);

/** Prix saisi dans un formulaire (chaîne) : chiffres uniquement, puis entier > 0. */
export const priceFcfaFormSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, fr.validation.priceDigits)
  .transform((value) => Number(value))
  .pipe(z.number().int().positive(fr.validation.pricePositive).max(100_000_000));

/** Frais de livraison saisis dans un formulaire : entier >= 0. */
export const feeFcfaFormSchema = z
  .string()
  .trim()
  .regex(/^\d+$/, fr.validation.feeInvalid)
  .transform((value) => Number(value))
  .pipe(z.number().int().nonnegative(fr.validation.feeInvalid).max(1_000_000));

/** Prix déjà typé (API JSON) : un nombre décimal ou négatif est refusé net. */
export const priceFcfaSchema = z
  .number({ message: fr.validation.priceDigits })
  .int(fr.validation.priceDigits)
  .positive(fr.validation.pricePositive)
  .max(100_000_000);

export const feeFcfaSchema = z
  .number({ message: fr.validation.feeInvalid })
  .int(fr.validation.feeInvalid)
  .nonnegative(fr.validation.feeInvalid)
  .max(1_000_000);

export const signupSchema = z.object({
  businessName: z.string().trim().min(2, fr.validation.businessName).max(120),
  businessType: z.enum(["restaurant"]),
  slug: slugSchema,
  phone: phoneSchema,
  email: emailSchema,
});

export const onboardingSchema = signupSchema.omit({ email: true });

export const businessInfoSchema = z.object({
  openingHours: z.record(z.string(), z.string().max(60)).default({}),
  address: z.string().trim().max(300).optional().nullable(),
  rules: z.string().trim().max(2000).optional().nullable(),
  freeText: z.string().trim().max(4000).optional().nullable(),
});

export const deliveryZoneSchema = z.object({
  neighborhood: z.string().trim().min(1, fr.validation.neighborhoodRequired).max(120),
  feeFcfa: feeFcfaSchema,
  isActive: z.boolean().default(true),
});

export const deliveryZoneFormSchema = z.object({
  neighborhood: z.string().trim().min(1, fr.validation.neighborhoodRequired).max(120),
  feeFcfa: feeFcfaFormSchema,
  isActive: z.boolean().default(true),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(1, fr.validation.nameRequired).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().min(1).max(60).default("divers"),
  priceFcfa: priceFcfaSchema,
  available: z.boolean().default(true),
});

export const menuItemFormSchema = z.object({
  name: z.string().trim().min(1, fr.validation.nameRequired).max(120),
  description: z.string().trim().max(500).optional().nullable(),
  category: z.string().trim().min(1).max(60).default("divers"),
  priceFcfa: priceFcfaFormSchema,
  available: z.boolean().default(true),
});

export const menuItemUpdateSchema = menuItemSchema.partial().extend({
  id: z.string().uuid(),
});

export const inviteSchema = z.object({
  email: emailSchema,
  displayName: z.string().trim().max(120).optional().nullable(),
});

export type MenuItemInput = z.infer<typeof menuItemSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
