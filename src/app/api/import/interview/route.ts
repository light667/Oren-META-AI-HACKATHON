import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { extractInterviewAnswer } from "@/lib/import/extract";
import { MetaLlmProvider } from "@/providers/llm/meta";
import { z } from "zod";

export const instant = false;

const bodySchema = z.object({
  questionId: z.enum(["hours", "zones", "address", "groupBookings", "rules"]),
  answer: z.string().trim().min(1).max(2000),
});

/**
 * Une réponse libre de l'interview guidée : le modèle range les faits
 * dans la fiche, il ne décide ni des questions (calculées en code à
 * partir des manques) ni d'aucune publication.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) return jsonError(400, fr.common.error);

  try {
    const result = await extractInterviewAnswer(
      new MetaLlmProvider(),
      fr.setup.questions[parsed.data.questionId],
      parsed.data.answer,
    );
    return NextResponse.json(result);
  } catch {
    return jsonError(502, fr.common.error);
  }
}
