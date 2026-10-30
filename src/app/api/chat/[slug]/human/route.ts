import { z } from "zod";
import { requestWebHuman } from "@/channels/web";
import { createWebDeps, resolveBusinessBySlug } from "@/channels/web/server";
import { fr } from "@/i18n/fr";

export const instant = false;

const bodySchema = z.object({
  sessionId: z.string().trim().min(8).max(100),
});

type Params = { params: Promise<{ slug: string }> };

/** Bouton « Parler à un humain » : passage de main structuré, sans modèle. */
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

  await requestWebHuman(deps, {
    businessId: business.id,
    sessionId: parsed.data.sessionId,
  });
  return Response.json({ ok: true, message: fr.chat.humanRequested });
}
