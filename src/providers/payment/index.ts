/**
 * PaymentProvider — interface seulement pour le hackathon.
 * Implémentations : paiement à la livraison / sur place, et faux
 * fournisseur de test. Mobile Money viendra plus tard, sans changer
 * le reste du code.
 */

export type PaymentMethod = "cash_on_delivery" | "cash_on_pickup" | "fake" | "mobile_money";

export interface PaymentRequest {
  businessId: string;
  orderId: string;
  /** Montant entier en FCFA, calculé par le code (jamais par le modèle). */
  amountFcfa: number;
  method: PaymentMethod;
  customerPhone?: string;
}

export interface PaymentResult {
  status: "pending" | "paid" | "failed";
  method: PaymentMethod;
  reference: string;
  detail: string;
}

export interface PaymentProvider {
  readonly name: string;
  readonly method: PaymentMethod;
  requestPayment(input: PaymentRequest): Promise<PaymentResult>;
}

/** Paiement à la livraison / sur place : aucun encaissement en ligne. */
export class CashPaymentProvider implements PaymentProvider {
  readonly name = "cash";
  constructor(readonly method: "cash_on_delivery" | "cash_on_pickup" = "cash_on_delivery") {}
  async requestPayment(input: PaymentRequest): Promise<PaymentResult> {
    return {
      status: "pending",
      method: this.method,
      reference: `cash-${input.orderId}`,
      detail: "À régler en espèces à la livraison ou sur place.",
    };
  }
}

/** Faux fournisseur pour les tests et la démo hors ligne. */
export class FakePaymentProvider implements PaymentProvider {
  readonly name = "fake";
  readonly method = "fake" as const;
  async requestPayment(input: PaymentRequest): Promise<PaymentResult> {
    return {
      status: "paid",
      method: "fake",
      reference: `fake-${input.orderId}`,
      detail: `Paiement factice de ${input.amountFcfa} FCFA simulé.`,
    };
  }
}
