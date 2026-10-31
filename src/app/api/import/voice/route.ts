import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { jsonError, requireOwner } from "@/lib/api";
import { extractInfoFromTranscript } from "@/lib/import/extract";
import { MetaLlmProvider } from "@/providers/llm/meta";

export const instant = false;

/**
 * Message vocal du patron : transcription (muse-voice-transcribe),
 * puis extraction des informations. Aucune publication ici non plus.
 * L'audio attendu est un WAV PCM (l'enregistreur du navigateur en
 * produit directement) ; les autres formats sont refusés proprement.
 */
export async function POST(request: Request) {
  const auth = await requireOwner();
  if ("response" in auth) return auth.response;

  const form = await request.formData().catch(() => null);
  const file = form?.get("audio");
  if (!(file instanceof File)) return jsonError(400, fr.common.error);
  if (file.size > 30_000_000) return jsonError(400, fr.common.error);

  const llm = new MetaLlmProvider();
  try {
    const data = new Uint8Array(await file.arrayBuffer());
    const transcription = await llm.transcribe({
      data,
      filename: file.name || "voix.wav",
      mimeType: file.type || "audio/wav",
      languageBias: ["French"],
    });
    const extracted = await extractInfoFromTranscript(llm, transcription.text);
    return NextResponse.json({ transcript: transcription.text, ...extracted });
  } catch {
    return jsonError(502, fr.common.error);
  }
}
