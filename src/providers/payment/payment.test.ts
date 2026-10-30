import { describe, expect, it } from "vitest";
import { CashPaymentProvider, FakePaymentProvider } from "./index";

describe("PaymentProvider — livraison / sur place et faux fournisseur", () => {
  it("paiement à la livraison : rien n'est encaissé en ligne", async () => {
    const provider = new CashPaymentProvider("cash_on_delivery");
    const result = await provider.requestPayment({
      businessId: "b1",
      orderId: "o1",
      amountFcfa: 5000,
      method: "cash_on_delivery",
    });
    expect(result.status).toBe("pending");
    expect(result.method).toBe("cash_on_delivery");
  });

  it("paiement sur place : même principe, autre mode", async () => {
    const provider = new CashPaymentProvider("cash_on_pickup");
    const result = await provider.requestPayment({
      businessId: "b1",
      orderId: "o1",
      amountFcfa: 5000,
      method: "cash_on_pickup",
    });
    expect(result.method).toBe("cash_on_pickup");
    expect(result.status).toBe("pending");
  });

  it("faux fournisseur de test : simule un paiement, clairement factice", async () => {
    const result = await new FakePaymentProvider().requestPayment({
      businessId: "b1",
      orderId: "o1",
      amountFcfa: 5000,
      method: "fake",
    });
    expect(result.status).toBe("paid");
    expect(result.method).toBe("fake");
    expect(result.detail).toContain("factice");
  });
});
