/**
 * Magasin Supabase RÉEL contre le projet distant (vrai PostgREST).
 *
 * Désactivé par défaut : ne s'exécute que si OREN_REMOTE_TEST=1 et que
 * .env/.env.local fournit NEXT_PUBLIC_SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY. Crée une entreprise de test jetable
 * (slug adversarial-<horodatage>), rejoue les attaques principales
 * (parcours complet, autre session, confirmations simultanées,
 * récapitulatif modifié, rejeu), puis supprime l'entreprise
 * (suppression en cascade) et vérifie qu'il n'en reste rien.
 *
 * Lancement : OREN_REMOTE_TEST=1 npx vitest run tests/db/remote-store.test.ts
 */
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  confirmOrder,
  prepareOrder,
} from "@/capabilities/catalog-orders/order-service";
import { SupabaseAssistantStore } from "@/core/supabase-store";
import type { BusinessRecord } from "@/core/store";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const ENABLED = process.env.OREN_REMOTE_TEST === "1" && Boolean(url && serviceKey);

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

describe.skipIf(!ENABLED)("SupabaseAssistantStore contre le projet distant", () => {
  const admin = createClient(url!, serviceKey!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const store = new SupabaseAssistantStore(admin);
  const slug = `adversarial-${Date.now()}`;
  let businessId = "";
  let business: BusinessRecord;
  let itemId = "";

  async function prepareFlow(anon: string) {
    const session = await store.getOrCreateSession(businessId, anon);
    const conversation = await store.createConversation({
      businessId,
      sessionId: session.id,
      customerId: null,
      channel: "web",
    });
    const prep = await prepareOrder(store, business, {
      items: [{ menuItemId: itemId, quantity: 2 }],
      deliveryZone: "Agoè",
      sessionId: session.id,
      conversationId: conversation.id,
      customerId: null,
    });
    return { session, conversation, prep, token: String(prep.confirmationToken) };
  }

  async function sayYes(conversationId: string): Promise<void> {
    // Tour ultérieur, comme entre deux vrais messages du client.
    await sleep(10);
    await store.addMessage({
      businessId,
      conversationId,
      senderRole: "customer",
      content: "oui",
    });
  }

  beforeAll(async () => {
    const { data: created, error } = await admin
      .from("businesses")
      .insert({ name: "Entreprise de test adverse", slug })
      .select("id")
      .single();
    if (error || !created) throw new Error(`création entreprise distante : ${error?.message}`);
    businessId = created.id;
    const found = await store.getBusiness(businessId);
    if (!found) throw new Error("entreprise distante introuvable après création");
    business = found;

    const { data: item, error: itemError } = await admin
      .from("menu_items")
      .insert({
        business_id: businessId,
        name: "Plat de test adverse",
        description: "Plat jetable de la relecture adverse",
        price_fcfa: 2000,
        category: "test",
      })
      .select("id")
      .single();
    if (itemError || !item) throw new Error(`création plat distant : ${itemError?.message}`);
    itemId = item.id;

    const { error: zoneError } = await admin
      .from("delivery_zones")
      .insert({ business_id: businessId, neighborhood: "Agoè", fee_fcfa: 500 });
    if (zoneError) throw new Error(`création zone distante : ${zoneError.message}`);
  }, 60_000);

  afterAll(async () => {
    if (!businessId) return;
    // Nettoyage : la suppression de l'entreprise cascade sur toutes ses lignes.
    await admin.from("businesses").delete().eq("id", businessId);
    const { data } = await admin
      .from("businesses")
      .select("id")
      .eq("id", businessId)
      .maybeSingle();
    expect(data).toBeNull();
  }, 60_000);

  it("parcours complet : prepare calcule 4500 FCFA, « oui » confirme, rejeu refusé", async () => {
    const { session, conversation, prep, token } = await prepareFlow("distant-complet");
    expect(prep.totalFcfa).toBe(4500);
    await sayYes(conversation.id);
    const result = await confirmOrder(store, business, {
      token,
      conversationId: conversation.id,
      sessionId: session.id,
    });
    expect(result).toMatchObject({ ok: true, status: "confirmed", totalFcfa: 4500 });
    const order = await store.getOrder(businessId, String(prep.orderId));
    expect(order?.status).toBe("confirmed");
    await expect(
      confirmOrder(store, business, {
        token,
        conversationId: conversation.id,
        sessionId: session.id,
      }),
    ).rejects.toThrow();
  }, 60_000);

  it("jeton d'une autre session : refusé à distance", async () => {
    const victim = await prepareFlow("distant-victime");
    const attackerSession = await store.getOrCreateSession(businessId, "distant-attaquant");
    const attackerConversation = await store.createConversation({
      businessId,
      sessionId: attackerSession.id,
      customerId: null,
      channel: "web",
    });
    await sayYes(attackerConversation.id);
    await expect(
      confirmOrder(store, business, {
        token: victim.token,
        conversationId: attackerConversation.id,
        sessionId: attackerSession.id,
      }),
    ).rejects.toThrow();
    const order = await store.getOrder(businessId, String(victim.prep.orderId));
    expect(order?.status).toBe("pending");
  }, 60_000);

  it("deux confirmations simultanées : une seule gagne à distance", async () => {
    const { session, conversation, prep, token } = await prepareFlow("distant-concurrence");
    await sayYes(conversation.id);
    const results = await Promise.allSettled([
      confirmOrder(store, business, {
        token,
        conversationId: conversation.id,
        sessionId: session.id,
      }),
      confirmOrder(store, business, {
        token,
        conversationId: conversation.id,
        sessionId: session.id,
      }),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    const order = await store.getOrder(businessId, String(prep.orderId));
    expect(order?.status).toBe("confirmed");
    expect(String(prep.orderId)).toBeTruthy();
  }, 60_000);

  it("récapitulatif modifié en base après émission : refusé à distance", async () => {
    const { session, conversation, prep, token } = await prepareFlow("distant-tamper");
    await sayYes(conversation.id);
    const { error } = await admin
      .from("order_items")
      .update({ item_name: "Plat piégé distant" })
      .eq("order_id", String(prep.orderId));
    if (error) throw new Error(`modification distante : ${error.message}`);
    await expect(
      confirmOrder(store, business, {
        token,
        conversationId: conversation.id,
        sessionId: session.id,
      }),
    ).rejects.toThrow();
    const order = await store.getOrder(businessId, String(prep.orderId));
    expect(order?.status).toBe("pending");
  }, 60_000);
});
