import { describe, expect, it } from "vitest";
import { confirmWebOrder, handleWebMessage, requestWebHuman } from "@/channels/web";
import { FakeStore } from "../core/fake-store";
import { ScriptedLlm } from "../core/scripted-llm";

const BIZ = "biz-1";
const SESSION = "anon-web-test-1234";

function setup() {
  const store = new FakeStore();
  store.seedChezTest(BIZ);
  const llm = new ScriptedLlm([
    {
      type: "tool",
      name: "prepare_order",
      arguments: {
        items: [
          { menuItemId: "item-attieke", quantity: 2 },
          { menuItemId: "item-jus", quantity: 1 },
        ],
        deliveryZone: "Agoè",
      },
    },
    { type: "text", content: "Voici le récapitulatif de votre commande." },
  ]);
  return { store, llm, deps: { store, llm } };
}

describe("canal web — commande complète par le bouton « Je confirme »", () => {
  it("prepare renvoie la carte structurée, le bouton confirme sans texte interprété", async () => {
    const { store, deps } = setup();

    // 1) Le client commande par chat : le cœur chiffre en code (5000 FCFA).
    const reply = await handleWebMessage(deps, {
      businessId: BIZ,
      sessionId: SESSION,
      text: "Je voudrais 2 attiéké poulet et 1 jus, livrés à Agoè",
    });
    expect(reply.pendingConfirmation).not.toBeNull();
    expect(reply.pendingConfirmation?.totalFcfa).toBe(5000);
    const token = reply.pendingConfirmation?.token ?? "";
    expect(token.length).toBeGreaterThan(10);

    // 2) Bouton « Je confirme » : action structurée avec jeton, nom,
    // téléphone et paiement sur place. Le dernier message texte du
    // client n'est PAS un accord : le chemin texte échouerait ici,
    // le chemin structuré est le chemin principal et doit passer.
    const result = await confirmWebOrder(deps, {
      businessId: BIZ,
      sessionId: SESSION,
      token,
      customerName: "Aïcha Mensah",
      customerPhone: "+228 90 11 22 33",
      paymentMethod: "cash_on_pickup",
    });
    expect(result.ok).toBe(true);

    const orders = [...store.orders.values()];
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("confirmed");
    expect(orders[0].paymentMethod).toBe("cash_on_pickup");
    expect(orders[0].totalFcfa).toBe(5000);

    // Client stocké, téléphone non vérifié à ce stade.
    const customers = [...store.customers.values()];
    expect(customers).toHaveLength(1);
    expect(customers[0].name).toBe("Aïcha Mensah");
    expect(customers[0].phone).toBe("+228 90 11 22 33");
    expect(customers[0].phoneVerifiedAt).toBeNull();
    const session = [...store.sessions.values()][0];
    expect(session.customerId).toBe(customers[0].id);

    // 3) Le même jeton ne confirme pas deux fois.
    const replay = await confirmWebOrder(deps, {
      businessId: BIZ,
      sessionId: SESSION,
      token,
      customerName: "Aïcha Mensah",
      customerPhone: "+228 90 11 22 33",
      paymentMethod: "cash_on_delivery",
    });
    expect(replay.ok).toBe(false);
    expect([...store.orders.values()]).toHaveLength(1);
  });

  it("jeton inconnu refusé, aucune écriture client ni commande confirmée", async () => {
    const { store, deps } = setup();
    await handleWebMessage(deps, {
      businessId: BIZ,
      sessionId: SESSION,
      text: "Je voudrais 2 attiéké poulet et 1 jus, livrés à Agoè",
    });
    const result = await confirmWebOrder(deps, {
      businessId: BIZ,
      sessionId: SESSION,
      token: "jeton-invente",
      customerName: "Aïcha Mensah",
      customerPhone: "+228 90 11 22 33",
      paymentMethod: "cash_on_delivery",
    });
    expect(result.ok).toBe(false);
    expect([...store.orders.values()][0].status).toBe("pending");
  });

  it("bouton humain : conversation « à reprendre », assistant en pause, audit présent", async () => {
    const { store, deps } = setup();
    await requestWebHuman(deps, { businessId: BIZ, sessionId: SESSION });
    const conv = [...store.conversations.values()][0];
    expect(conv.status).toBe("a_reprendre");
    expect(conv.assistantPaused).toBe(true);
    expect(store.audit.some((a) => a.action === "structured_handoff")).toBe(true);
  });
});
