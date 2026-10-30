import { z } from "zod";
import { handleWebMessage } from "@/channels/web";
import { createWebDeps, resolveBusinessBySlug } from "@/channels/web/server";
import { fr } from "@/i18n/fr";

export const instant = false;

const bodySchema = z.object({
  sessionId: z.string().trim().min(8).max(100),
  text: z.string().trim().min(1).max(4000),
});

type Params = { params: Promise<{ slug: string }> };

/**
 * Message client du canal web, réponse en flux (SSE) : un événement
 * d'attente, puis le texte de l'assistant découpé en morceaux affichés
 * en continu, puis l'événement final (carte de confirmation éventuelle).
 */
export async function POST(request: Request, { params }: Params) {
  const { slug } = await params;
  const body: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: fr.chat.loadError }, { status: 400 });
  }

  const deps = createWebDeps();
  const business = await resolveBusinessBySlug(deps, slug);
  if (!business) {
    return Response.json({ error: fr.chat.notFoundBody }, { status: 404 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: Record<string, unknown>) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };
      try {
        send({ type: "waiting" });
        const reply = await handleWebMessage(deps, {
          businessId: business.id,
          sessionId: parsed.data.sessionId,
          text: parsed.data.text,
        });
        // Affichage en continu : le texte final est émis par petits morceaux.
        const chunks = reply.text.match(/.{1,24}(\s|$)/g) ?? [reply.text];
        for (const chunk of chunks) {
          send({ type: "delta", text: chunk });
        }
        send({
          type: "done",
          handedToHuman: reply.handedToHuman,
          pendingConfirmation: reply.pendingConfirmation,
        });
      } catch {
        send({ type: "error", error: fr.chat.loadError });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
