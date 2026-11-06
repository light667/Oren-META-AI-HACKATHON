/**
 * Mode démo local (UX uniquement, avant tout branchement paiement).
 * Aucun appel réseau : menu fictif, réponses scriptées, commandes
 * persistées dans le stockage du navigateur. Les prix et totaux sont
 * calculés par ce code, jamais par un modèle — comme en production.
 * La confirmation exige un jeton à usage unique lié au récapitulatif,
 * exactement comme le vrai parcours (voir core/handleMessage).
 */

export interface DemoMenuItem {
  id: string;
  name: string;
  description: string | null;
  priceFcfa: number;
  category: string;
  available: boolean;
}

export const DEMO_BUSINESS_NAME = "Chez Chef T (démo)";
export const DEMO_DELIVERY_FEE_FCFA = 500;
export const DEMO_STORAGE_KEY = "oren-demo-v1";

export const DEMO_MENU: DemoMenuItem[] = [
  { id: "demo-alloco", name: "Alloco poulet", description: "Bananes plantain, poulet grillé, oignons", priceFcfa: 1500, category: "Plats", available: true },
  { id: "demo-attieke", name: "Attiéké poulet", description: "Attiéké, poulet, crudités", priceFcfa: 1800, category: "Plats", available: true },
  { id: "demo-foutou", name: "Foutou sauce arachide", description: "Foutou pilé, sauce arachide, poulet", priceFcfa: 2000, category: "Plats", available: true },
  { id: "demo-brochettes", name: "Brochettes de bœuf", description: "4 brochettes, frites, salade", priceFcfa: 2500, category: "Plats", available: true },
  { id: "demo-jus-gingembre", name: "Jus de gingembre", description: "Fait maison, 50 cl", priceFcfa: 500, category: "Boissons", available: true },
  { id: "demo-jus-bissap", name: "Jus de bissap", description: "Fait maison, 50 cl", priceFcfa: 500, category: "Boissons", available: true },
];

export interface DemoOrderLine {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPriceFcfa: number;
}

export interface DemoPending {
  orderId: string;
  token: string;
  lines: DemoOrderLine[];
  subtotalFcfa: number;
  deliveryFeeFcfa: number;
  totalFcfa: number;
  summary: string;
}

export interface DemoOrder extends DemoPending {
  customerName: string;
  customerPhone: string;
  paymentMethod: "cash_on_delivery" | "cash_on_pickup";
  paymentStatus: "pending";
  paymentReference: string;
  createdAt: number;
}

export interface DemoReply {
  text: string;
  pending?: DemoPending;
  handedToHuman?: boolean;
}

interface DemoState {
  orders: DemoOrder[];
  usedTokens: string[];
}

/** Stockage minimal compatible localStorage (factice en test). */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function formatFcfa(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

function loadState(storage: StorageLike): DemoState {
  try {
    const raw = storage.getItem(DEMO_STORAGE_KEY);
    if (!raw) return { orders: [], usedTokens: [] };
    const parsed = JSON.parse(raw) as Partial<DemoState>;
    return {
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      usedTokens: Array.isArray(parsed.usedTokens) ? parsed.usedTokens : [],
    };
  } catch {
    return { orders: [], usedTokens: [] };
  }
}

function saveState(storage: StorageLike, state: DemoState): void {
  try {
    storage.setItem(DEMO_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Stockage plein ou bloqué : la démo continue en mémoire de page.
  }
}

export function listDemoOrders(storage: StorageLike): DemoOrder[] {
  return loadState(storage).orders;
}

export function resetDemo(storage: StorageLike): void {
  storage.removeItem(DEMO_STORAGE_KEY);
}
