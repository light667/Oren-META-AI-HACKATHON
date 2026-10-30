/**
 * Port de données du cœur de l'assistant.
 * handleMessage ne connaît ni Supabase ni les canaux : il ne parle
 * qu'à cette interface. Implémentation réelle : supabase-store.ts
 * (service_role, côté serveur). Les tests utilisent un factice mémoire.
 */

export interface BusinessRecord {
  id: string;
  name: string;
  slug: string;
  businessType: string;
  enabledCapabilities: string[];
  config: Record<string, unknown>;
}

export interface BusinessInfoRecord {
  openingHours: Record<string, string>;
  address: string | null;
  rules: string | null;
  freeText: string | null;
}

export interface DeliveryZoneRecord {
  id: string;
  neighborhood: string;
  feeFcfa: number;
  isActive: boolean;
}

export interface MenuItemRecord {
  id: string;
  name: string;
  description: string | null;
  priceFcfa: number;
  category: string;
  available: boolean;
}

export interface SessionRecord {
  id: string;
  businessId: string;
  customerId: string | null;
  anonymousId: string;
}

export interface ConversationRecord {
  id: string;
  businessId: string;
  sessionId: string;
  customerId: string | null;
  channel: string;
  status: "en_cours" | "a_reprendre" | "resolue" | "fermee";
  assistantPaused: boolean;
}

export interface MessageRecord {
  id: string;
  conversationId: string;
  senderRole: "customer" | "assistant" | "human" | "system";
  content: string;
  createdAt: string;
}

export interface OrderLineRecord {
  menuItemId: string | null;
  itemName: string;
  unitPriceFcfa: number;
  quantity: number;
  lineTotalFcfa: number;
}

export interface OrderRecord {
  id: string;
  businessId: string;
  /** Session et conversation qui ont préparé la commande (liaison du jeton). */
  sessionId: string | null;
  conversationId: string | null;
  status: string;
  totalFcfa: number;
  deliveryFeeFcfa: number;
  paymentMethod: string;
  createdAt?: string;
  /** Quand le client a confirmé (commande « reçue » chez le patron). */
  receivedAt?: string | null;
  /** Quand le patron a accepté : le délai d'acceptation est enregistré. */
  acceptedAt?: string | null;
  fallbackEmailSentAt?: string | null;
  lines: OrderLineRecord[];
}

export interface ConfirmationTokenRecord {
  id: string;
  businessId: string;
  orderId: string;
  tokenHash: string;
  summaryHash: string | null;
  expiresAt: string;
  usedAt: string | null;
  createdAt: string;
}

export interface AuditEntry {
  businessId: string;
  actorType: "staff" | "customer" | "assistant" | "system";
  actorId: string | null;
  toolName: string | null;
  action: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
}

export interface AssistantStore {
  getBusiness(businessId: string): Promise<BusinessRecord | null>;
  getBusinessBySlug(slug: string): Promise<BusinessRecord | null>;
  /** Crée ou retrouve un client par téléphone (non vérifié à ce stade). */
  upsertCustomerByPhone(
    businessId: string,
    input: { name: string | null; phone: string },
  ): Promise<{ id: string }>;
  setSessionCustomer(sessionId: string, customerId: string): Promise<void>;
  updateOrderCustomerAndPayment(
    businessId: string,
    orderId: string,
    customerId: string | null,
    paymentMethod: string,
  ): Promise<void>;
  getBusinessInfo(businessId: string): Promise<BusinessInfoRecord | null>;
  listDeliveryZones(businessId: string): Promise<DeliveryZoneRecord[]>;
  listMenuItems(businessId: string): Promise<MenuItemRecord[]>;
  getMenuItem(businessId: string, menuItemId: string): Promise<MenuItemRecord | null>;

  getOrCreateSession(businessId: string, anonymousId: string): Promise<SessionRecord>;
  getOpenConversation(sessionId: string, channel: string): Promise<ConversationRecord | null>;
  createConversation(input: {
    businessId: string;
    sessionId: string;
    customerId: string | null;
    channel: string;
  }): Promise<ConversationRecord>;
  updateConversation(
    conversationId: string,
    patch: { status?: ConversationRecord["status"]; assistantPaused?: boolean },
  ): Promise<void>;

  listMessages(conversationId: string, limit: number): Promise<MessageRecord[]>;
  addMessage(input: {
    businessId: string;
    conversationId: string;
    senderRole: MessageRecord["senderRole"];
    content: string;
  }): Promise<MessageRecord>;
  /** Dernier message écrit par le client dans cette conversation. */
  getLastCustomerMessage(conversationId: string): Promise<MessageRecord | null>;

  createPendingOrder(input: {
    businessId: string;
    customerId: string | null;
    sessionId: string;
    conversationId: string;
    lines: OrderLineRecord[];
    deliveryFeeFcfa: number;
    totalFcfa: number;
    paymentMethod: string;
  }): Promise<OrderRecord>;
  getOrder(businessId: string, orderId: string): Promise<OrderRecord | null>;
  updateOrderStatus(businessId: string, orderId: string, status: string): Promise<void>;

  createConfirmationToken(input: {
    businessId: string;
    orderId: string;
    tokenHash: string;
    summaryHash: string;
    expiresAt: string;
  }): Promise<ConfirmationTokenRecord>;
  getConfirmationTokenByHash(tokenHash: string): Promise<ConfirmationTokenRecord | null>;
  /**
   * Consomme le jeton de façon atomique : renvoie true uniquement pour
   * l'appel qui passe used_at de null à une date. Tout autre appel
   * (rejeu, course entre deux confirmations) renvoie false.
   */
  consumeConfirmationToken(tokenId: string): Promise<boolean>;

  logAudit(entry: AuditEntry): Promise<void>;
}
