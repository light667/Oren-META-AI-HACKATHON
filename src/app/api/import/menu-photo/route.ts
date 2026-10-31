import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { extractMenuFromImage } from "@/lib/import/extract";
import { MetaLlmProvider } from "@/providers/llm/meta";
import { z } from "zod";

export const instant = false;

const bodySchema = z.object({
  // Photo envoyée en data URL (jpeg/png/webp), taille bornée.
  image: z
    .string()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, fr.common.error)
    .max(11_000_000),
});

/**
 * Lecture d'une photo de menu : extraction seule, AUCUNE publication.
 * Le résultat part dans l'écran de vérification du patron.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, fr.common.error);

  try {
    const result = await extractMenuFromImage(new MetaLlmProvider(), parsed.data.image);
    return NextResponse.json(result);
  } catch {
    return jsonError(502, fr.common.error);
  }
}
