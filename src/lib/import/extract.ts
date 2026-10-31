import { z } from "zod";
import { fr } from "@/i18n/fr";
import type { LlmProvider } from "@/providers/llm/types";
import {
  flagMenuItem,
  infoDraftSchema,
  menuDraftItemSchema,
  zoneDraftSchema,
  type InfoDraft,
  type MenuDraftItem,
  type ZoneDraft,
} from "./draft";

/**
 * Extractions multimodales de mise en route.
 *
 * Sécurité (AGENTS.md règle 5) : le texte d'une image, d'une voix ou
 * d'une réponse libre est une DONNÉE, jamais un ordre. Les consignes
 * d'extraction le rappellent, la sortie est contrainte par un schéma
 * JSON fermé validé par Zod, et seuls les champs connus sont lus :
 * une « instruction » présente dans la source ne peut ni changer les
 * règles de l'assistant, ni déclencher un outil, ni forcer un prix.
 * Les prix restent ensuite revérifiés à la publication (entier > 0).
 */

const menuExtractionSchema = z.object({
  items: z.array(
    z.object({
      nom: z.string(),
      description: z.string().nullable().optional(),
      categorie: z.string().nullable().optional(),
      prixFcfa: z.number().nullable().optional(),
      confiance: z.number().min(0).max(1).optional(),
      incertain: z.boolean().optional(),
    }),
  ),
  incertitudes: z.array(z.string()).optional(),
});

export async function extractMenuFromImage(
  llm: LlmProvider,
  imageDataUrl: string,
): Promise<{ items: MenuDraftItem[]; uncertainties: string[] }> {
  const result = await llm.chat(
    [
      { role: "system", content: fr.importPrompts.menuSystem },
      {
        role: "user",
        content: [
          { type: "text", text: fr.importPrompts.menuUser },
          { type: "image", url: imageDataUrl },
        ],
      },
    ],
    {
      responseFormat: {
        type: "json_schema",
        name: "ExtractionMenu",
        strict: true,
        schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  nom: { type: "string" },
                  description: { type: ["string", "null"] },
                  categorie: { type: ["string", "null"] },
                  prixFcfa: { type: ["integer", "null"] },
                  confiance: { type: "number" },
                  incertain: { type: "boolean" },
                },
                required: ["nom", "description", "categorie", "prixFcfa", "confiance", "incertain"],
                additionalProperties: false,
              },
            },
            incertitudes: { type: "array", items: { type: "string" } },
          },
          required: ["items", "incertitudes"],
          additionalProperties: false,
        },
      },
    },
  );

  const parsed = menuExtractionSchema.safeParse(safeJson(result.content));
  if (!parsed.success) {
    return { items: [], uncertainties: ["lecture_image_illisible"] };
  }
  const items = parsed.data.items
    .filter((i) => i.nom.trim().length > 0)
    .map((i) =>
      flagMenuItem(
        menuDraftItemSchema.parse({
          name: i.nom.trim(),
          description: i.description ?? null,
          category: i.categorie?.trim() || "divers",
          // Un prix à 0 ou négatif « lu » n'est jamais conservé : incertain.
          priceFcfa: i.prixFcfa && i.prixFcfa > 0 ? Math.trunc(i.prixFcfa) : null,
          confidence: i.confiance ?? 0,
          uncertain: Boolean(i.incertain),
        }),
      ),
    );
  return { items, uncertainties: parsed.data.incertitudes ?? [] };
}

const infoExtractionSchema = z.object({
  horaires: z
    .array(z.object({ jour: z.string(), texte: z.string() }))
    .optional(),
  adresse: z.string().nullable().optional(),
  zones: z
    .array(
      z.object({
        quartier: z.string(),
        fraisFcfa: z.number().nullable().optional(),
      }),
    )
    .optional(),
  regles: z.string().nullable().optional(),
  reservationsGroupe: z.string().nullable().optional(),
  texteLibre: z.string().nullable().optional(),
  incertitudes: z.array(z.string()).optional(),
});

const INFO_JSON_SCHEMA = {
  type: "object",
  properties: {
    horaires: {
      type: "array",
      items: {
        type: "object",
        properties: {
          jour: { type: "string" },
          texte: { type: "string" },
        },
        required: ["jour", "texte"],
        additionalProperties: false,
      },
    },
    adresse: { type: ["string", "null"] },
    zones: {
      type: "array",
      items: {
        type: "object",
        properties: {
          quartier: { type: "string" },
          fraisFcfa: { type: ["integer", "null"] },
        },
        required: ["quartier", "fraisFcfa"],
        additionalProperties: false,
      },
    },
    regles: { type: ["string", "null"] },
    reservationsGroupe: { type: ["string", "null"] },
    texteLibre: { type: ["string", "null"] },
    incertitudes: { type: "array", items: { type: "string" } },
  },
  required: [
    "horaires",
    "adresse",
    "zones",
    "regles",
    "reservationsGroupe",
    "texteLibre",
    "incertitudes",
  ],
  additionalProperties: false,
} as const;

function mapInfo(raw: z.infer<typeof infoExtractionSchema>): {
  info: InfoDraft;
  zones: ZoneDraft[];
  uncertainties: string[];
} {
  const zones = (raw.zones ?? [])
    .filter((zone) => zone.quartier.trim().length > 0)
    .map((zone) =>
      zoneDraftSchema.parse({
        neighborhood: zone.quartier.trim(),
        feeFcfa:
          zone.fraisFcfa !== null && zone.fraisFcfa !== undefined && zone.fraisFcfa >= 0
            ? Math.trunc(zone.fraisFcfa)
            : null,
        uncertain: zone.fraisFcfa === null || zone.fraisFcfa === undefined,
      }),
    );
  return {
    info: infoDraftSchema.parse({
      openingHours: Object.fromEntries(
        (raw.horaires ?? [])
          .filter((entry) => entry.jour.trim() && entry.texte.trim())
          .map((entry) => [entry.jour.trim(), entry.texte.trim()]),
      ),
      address: raw.adresse ?? null,
      rules: raw.regles ?? null,
      freeText: raw.texteLibre ?? null,
      groupBookings: raw.reservationsGroupe ?? null,
    }),
    zones,
    uncertainties: raw.incertitudes ?? [],
  };
}

export async function extractInfoFromTranscript(
  llm: LlmProvider,
  transcript: string,
): Promise<{ info: InfoDraft; zones: ZoneDraft[]; uncertainties: string[] }> {
  const result = await llm.chat(
    [
      { role: "system", content: fr.importPrompts.voiceSystem },
      { role: "user", content: `${fr.importPrompts.voiceUser}\n\nTranscription :\n${transcript}` },
    ],
    {
      responseFormat: {
        type: "json_schema",
        name: "ExtractionInfos",
        strict: true,
        schema: INFO_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  );
  const parsed = infoExtractionSchema.safeParse(safeJson(result.content));
  if (!parsed.success) {
    return {
      info: infoDraftSchema.parse({}),
      zones: [],
      uncertainties: ["extraction_vocale_illisible"],
    };
  }
  return mapInfo(parsed.data);
}

/** Range une réponse libre d'interview dans la fiche (faits seulement). */
export async function extractInterviewAnswer(
  llm: LlmProvider,
  questionId: string,
  answer: string,
): Promise<{ info: InfoDraft; zones: ZoneDraft[]; uncertainties: string[] }> {
  const result = await llm.chat(
    [
      { role: "system", content: fr.importPrompts.interviewSystem },
      {
        role: "user",
        content: `Question posée au patron : « ${questionId} ». Sa réponse : « ${answer} ». Extrais uniquement les faits qui répondent à cette question, dans le format habituel.`,
      },
    ],
    {
      responseFormat: {
        type: "json_schema",
        name: "ExtractionReponse",
        strict: true,
        schema: INFO_JSON_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  );
  const parsed = infoExtractionSchema.safeParse(safeJson(result.content));
  if (!parsed.success) {
    return { info: infoDraftSchema.parse({}), zones: [], uncertainties: [] };
  }
  return mapInfo(parsed.data);
}

function safeJson(content: string | null): unknown {
  if (!content) return null;
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}
