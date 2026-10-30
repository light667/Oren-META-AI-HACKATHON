/**
 * Magasin Supabase RÉEL sur PostgreSQL réel (PGlite).
 *
 * SupabaseAssistantStore est exécuté tel quel, contre les vraies
 * migrations, via l'adaptateur PostgREST -> PGlite (tests/db/pglite-client).
 * On y rejoue les attaques de la relecture adverse : parcours complet,
 * jeton d'une autre session, confirmations simultanées, récapitulatif
 * modifié en base après émission du jeton, plat d'une autre entreprise.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  confirmOrder,
  prepareOrder,
} from "@/capabilities/catalog-orders/order-service";
import { SupabaseAssistantStore } from "@/core/supabase-store";
import { createMigratedDb, type Db } from "./harness";
import { createPgliteSupabaseClient } from "./pglite-client";

const BIZ_A = "a1111111-1111-4111-8111-111111111111";
const BIZ_B = "b2222222-2222-4222-8222-222222222222";
const ITEM_A = "a3333333-3333-4333-8333-333333333333";
const ITEM_B = "b4444444-4444-4444-8444-444444444444";

let db: Db;
let store: SupabaseAssistantStore;
let anonSeq = 0;

async function seedBusinesses(): Promise<void> {
  await db.exec(`
    insert into public.businesses (id, name, slug) values
      ('${BIZ_A}', 'Restaurant PGlite A', 'pglite-a'),
      ('${BIZ_B}', 'Restaurant PGlite B', 'pglite-b');
    insert into public.menu_items (id, business_id, name, description, price_fcfa, category) values
      ('${ITEM_A}', '${BIZ_A}', 'Plat A', 'Description A', 2000, 'cat-a'),
      ('${ITEM_B}', '${BIZ_B}', 'Plat B', 'Description B', 3000, 'cat-b');
    insert into public.delivery_zones (business_id, neighborhood, fee_fcfa) values
      ('${BIZ_A}', 'Agoè', 500);
  `);
}

async function prepareFlow(businessId: string) {
  anonSeq += 1;
  const business = await store.getBusiness(businessId);
  if (!business) throw new Error("entreprise manquante");
  const session = await store.getOrCreateSession(businessId, `anon-pglite-${anonSeq}`);
  const conversation = await store.createConversation({
    businessId,
    sessionId: session.id,
    customerId: null,
    channel: "web",
  });
  const prep = await prepareOrder(store, business, {
    items: [{ menuItemId: ITEM_A, quantity: 2 }],
    deliveryZone: "Agoè",
    sessionId: session.id,
    conversationId: conversation.id,
    customerId: null,
  });
  return { business, session, conversation, prep, token: String(prep.confirmationToken) };
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function sayYes(businessId: string, conversationId: string): Promise<void> {
  // L'accord arrive dans un tour ultérieur à la préparation : on laisse
  // passer quelques millisecondes, comme entre deux vrais messages.
  // À horodatage égal, confirmOrder refuse (échec sûr).
  await sleep(10);
  await store.addMessage({
    businessId,
    conversationId,
    senderRole: "customer",
    content: "oui",
  });
}

beforeAll(async () => {
  db = await createMigratedDb();
  await seedBusinesses();
  store = new SupabaseAssistantStore(
    createPgliteSupabaseClient(db) as unknown as SupabaseClient,
  );
}, 120_000);

afterAll(async () => {
  await db.close();
});

describe("SupabaseAssistantStore sur PGlite (base réelle)", () => {
  it("parcours complet : prepare calcule 4500 FCFA, « oui » confirme", async () => {
    const { business, session, conversation, prep, token } = await prepareFlow(BIZ_A);
    expect(prep.totalFcfa).toBe(4500);
    expect(prep.deliveryFeeFcfa).toBe(500);
    await sayYes(BIZ_A, conversation.id);
    const result = await confirmOrder(store, business, {
      token,
      conversationId: conversation.id,
      sessionId: session.id,
    });
    expect(result).toMatchObject({ ok: true, status: "confirmed", totalFcfa: 4500 });
    const order = await store.getOrder(BIZ_A, String(prep.orderId));
    expect(order?.status).toBe("confirmed");
    expect(order?.lines[0]).toMatchObject({ quantity: 2, lineTotalFcfa: 4000 });
  });

  it("plat d'une autre entreprise : refusé par le magasin réel", async () => {
    const business = await store.getBusiness(BIZ_A);
    if (!business) throw new Error("entreprise manquante");
    expect(await store.getMenuItem(BIZ_A, ITEM_B)).toBeNull();
    const session = await store.getOrCreateSession(BIZ_A, "anon-cross-item");
    const conversation = await store.createConversation({
      businessId: BIZ_A,
      sessionId: session.id,
      customerId: null,
      channel: "web",
    });
    await expect(
      prepareOrder(store, business, {
        items: [{ menuItemId: ITEM_B, quantity: 1 }],
        sessionId: session.id,
        conversationId: conversation.id,
        customerId: null,
      }),
    ).rejects.toThrow();
  });

  it("jeton d'une autre session : refusé par le magasin réel", async () => {
    const victim = await prepareFlow(BIZ_A);
    const attackerSession = await store.getOrCreateSession(BIZ_A, "anon-attaquant");
    const attackerConversation = await store.createConversation({
      businessId: BIZ_A,
      sessionId: attackerSession.id,
      customerId: null,
      channel: "web",
    });
    await sayYes(BIZ_A, attackerConversation.id);
    await expect(
      confirmOrder(store, victim.business, {
        token: victim.token,
        conversationId: attackerConversation.id,
        sessionId: attackerSession.id,
      }),
    ).rejects.toThrow();
    const order = await store.getOrder(BIZ_A, String(victim.prep.orderId));
    expect(order?.status).toBe("pending");
  });

  it("deux confirmations simultanées : une seule gagne (consommation atomique)", async () => {
    const { business, session, conversation, prep, token } = await prepareFlow(BIZ_A);
    await sayYes(BIZ_A, conversation.id);
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
    const order = await store.getOrder(BIZ_A, String(prep.orderId));
    expect(order?.status).toBe("confirmed");
    const used = await db.query<{ n: number }>(
      `select count(*) as n from confirmation_tokens where order_id = '${String(prep.orderId)}' and used_at is not null`,
    );
    expect(Number(used.rows[0].n)).toBe(1);
  });

  it("consommation atomique au niveau du magasin : true une fois, false ensuite", async () => {
    const { prep } = await prepareFlow(BIZ_A);
    const orderId = String(prep.orderId);
    const tokens = await store.getConfirmationTokenByHash(
      // Le jeton en clair n'est pas stocké ; on retrouve la ligne par la commande.
      await db
        .query<{ token_hash: string }>(
          `select token_hash from confirmation_tokens where order_id = '${orderId}'`,
        )
        .then((r) => r.rows[0].token_hash),
    );
    if (!tokens) throw new Error("jeton introuvable");
    const results = await Promise.all([
      store.consumeConfirmationToken(tokens.id),
      store.consumeConfirmationToken(tokens.id),
    ]);
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(await store.consumeConfirmationToken(tokens.id)).toBe(false);
  });

  it("récapitulatif modifié en base après émission : confirmation refusée", async () => {
    const { business, session, conversation, prep, token } = await prepareFlow(BIZ_A);
    await sayYes(BIZ_A, conversation.id);
    // Modification directe en base, hors code applicatif (patron malveillant, bug, autre outil).
    await db.exec(
      `update order_items set item_name = 'Plat piégé' where order_id = '${String(prep.orderId)}'`,
    );
    await expect(
      confirmOrder(store, business, {
        token,
        conversationId: conversation.id,
        sessionId: session.id,
      }),
    ).rejects.toThrow();
    const order = await store.getOrder(BIZ_A, String(prep.orderId));
    expect(order?.status).toBe("pending");
  });
});
