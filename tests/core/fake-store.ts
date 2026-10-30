import type {
  AssistantStore,
  AuditEntry,
  BusinessInfoRecord,
  BusinessRecord,
  ConfirmationTokenRecord,
  ConversationRecord,
  DeliveryZoneRecord,
  MenuItemRecord,
  MessageRecord,
  OrderLineRecord,
  OrderRecord,
  SessionRecord,
} from "@/core/store";

/** Magasin mémoire déterministe pour les tests du cœur (aucune base). */
export class FakeStore implements AssistantStore {
  businesses = new Map<string, BusinessRecord>();
  infos = new Map<string, BusinessInfoRecord>();
  zones = new Map<string, DeliveryZoneRecord[]>();
  menu = new Map<string, MenuItemRecord[]>();
  sessions = new Map<string, SessionRecord>();
  conversations = new Map<string, ConversationRecord>();
  messages: (MessageRecord & { businessId: string })[] = [];
  orders = new Map<string, OrderRecord>();
  tokens = new Map<string, ConfirmationTokenRecord>();
  audit: AuditEntry[] = [];
  private seq = 0;
  private readonly clockBase = Date.now();

  private id(prefix: string): string {
    this.seq += 1;
    return `${prefix}-${this.seq}`;
  }

  /** Horloge monotone : chaque écriture est strictement postérieure à la précédente. */
  private nowIso(): string {
    this.seq += 1;
    return new Date(this.clockBase + this.seq * 1000).toISOString();
  }

  seedChezTest(businessId = "biz-1", capabilities = ["catalog_orders"]): void {
    this.businesses.set(businessId, {
      id: businessId,
      name: "Chez Test",
      slug: "chez-test",
      businessType: "restaurant",
      enabledCapabilities: capabilities,
      config: {},
    });
    this.infos.set(businessId, {
      openingHours: { lundi: "10h-22h", dimanche: "fermé" },
      address: "Agoè, Lomé",
      rules: "Paiement à la livraison.",
      freeText: "Cuisine locale.",
    });
    this.zones.set(businessId, [
      { id: "zone-agoe", neighborhood: "Agoè", feeFcfa: 500, isActive: true },
      { id: "zone-centre", neighborhood: "Centre-ville", feeFcfa: 1000, isActive: true },
      { id: "zone-off", neighborhood: "Lointain", feeFcfa: 2000, isActive: false },
    ]);
    this.menu.set(businessId, [
      { id: "item-attieke", name: "Attiéké poulet", description: "Attiéké, poulet", priceFcfa: 2000, category: "attiéké", available: true },
      { id: "item-jus", name: "Jus de gingembre", description: "50 cl", priceFcfa: 500, category: "boissons", available: true },
      { id: "item-alloco", name: "Alloco poulet", description: "Plantain frit", priceFcfa: 1500, category: "alloco", available: false },
    ]);
  }

  customers = new Map<string, { id: string; businessId: string; name: string | null; phone: string; phoneVerifiedAt: string | null }>();

  async getBusiness(businessId: string) {
    return this.businesses.get(businessId) ?? null;
  }
  async getBusinessBySlug(slug: string) {
    return [...this.businesses.values()].find((b) => b.slug === slug) ?? null;
  }
  async upsertCustomerByPhone(
    businessId: string,
    input: { name: string | null; phone: string },
  ): Promise<{ id: string }> {
    const key = `${businessId}:${input.phone}`;
    const existing = this.customers.get(key);
    if (existing) {
      if (input.name) existing.name = input.name;
      return { id: existing.id };
    }
    const customer = {
      id: this.id("customer"),
      businessId,
      name: input.name,
      phone: input.phone,
      phoneVerifiedAt: null as string | null,
    };
    this.customers.set(key, customer);
    return { id: customer.id };
  }
  async setSessionCustomer(sessionId: string, customerId: string): Promise<void> {
    for (const session of this.sessions.values()) {
      if (session.id === sessionId) session.customerId = customerId;
    }
  }
  async updateOrderCustomerAndPayment(
    businessId: string,
    orderId: string,
    customerId: string | null,
    paymentMethod: string,
  ): Promise<void> {
    const order = this.orders.get(orderId);
    if (order && order.businessId === businessId) {
      order.paymentMethod = paymentMethod;
      (order as { customerId?: string | null }).customerId = customerId;
    }
  }
  async getBusinessInfo(businessId: string) {
    return this.infos.get(businessId) ?? null;
  }
  async listDeliveryZones(businessId: string) {
    return this.zones.get(businessId) ?? [];
  }
  async listMenuItems(businessId: string) {
    return this.menu.get(businessId) ?? [];
  }
  async getMenuItem(businessId: string, menuItemId: string) {
    return (this.menu.get(businessId) ?? []).find((i) => i.id === menuItemId) ?? null;
  }

  async getOrCreateSession(businessId: string, anonymousId: string): Promise<SessionRecord> {
    const key = `${businessId}:${anonymousId}`;
    const existing = this.sessions.get(key);
    if (existing) return existing;
    const session: SessionRecord = {
      id: this.id("session"),
      businessId,
      customerId: null,
      anonymousId,
    };
    this.sessions.set(key, session);
    return session;
  }

  async getOpenConversation(sessionId: string, channel: string) {
    return (
      [...this.conversations.values()].find(
        (c) =>
          c.sessionId === sessionId &&
          c.channel === channel &&
          (c.status === "en_cours" || c.status === "a_reprendre"),
      ) ?? null
    );
  }

  async createConversation(input: {
    businessId: string;
    sessionId: string;
    customerId: string | null;
    channel: string;
  }): Promise<ConversationRecord> {
    const conv: ConversationRecord = {
      id: this.id("conv"),
      businessId: input.businessId,
      sessionId: input.sessionId,
      customerId: input.customerId,
      channel: input.channel,
      status: "en_cours",
      assistantPaused: false,
    };
    this.conversations.set(conv.id, conv);
    return conv;
  }

  async updateConversation(
    conversationId: string,
    patch: { status?: ConversationRecord["status"]; assistantPaused?: boolean },
  ): Promise<void> {
    const conv = this.conversations.get(conversationId);
    if (!conv) return;
    if (patch.status !== undefined) conv.status = patch.status;
    if (patch.assistantPaused !== undefined) conv.assistantPaused = patch.assistantPaused;
  }

  async listMessages(conversationId: string, limit: number): Promise<MessageRecord[]> {
    return this.messages.filter((m) => m.conversationId === conversationId).slice(-limit);
  }

  async addMessage(input: {
    businessId: string;
    conversationId: string;
    senderRole: MessageRecord["senderRole"];
    content: string;
  }): Promise<MessageRecord> {
    const msg: MessageRecord & { businessId: string } = {
      id: this.id("msg"),
      businessId: input.businessId,
      conversationId: input.conversationId,
      senderRole: input.senderRole,
      content: input.content,
      createdAt: this.nowIso(),
    };
    this.messages.push(msg);
    return msg;
  }

  async getLastCustomerMessage(conversationId: string): Promise<MessageRecord | null> {
    const list = this.messages.filter(
      (m) => m.conversationId === conversationId && m.senderRole === "customer",
    );
    return list[list.length - 1] ?? null;
  }

  async createPendingOrder(input: {
    businessId: string;
    customerId: string | null;
    sessionId: string;
    conversationId: string;
    lines: OrderLineRecord[];
    deliveryFeeFcfa: number;
    totalFcfa: number;
    paymentMethod: string;
  }): Promise<OrderRecord> {
    const order: OrderRecord = {
      id: this.id("order"),
      businessId: input.businessId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      status: "pending",
      totalFcfa: input.totalFcfa,
      deliveryFeeFcfa: input.deliveryFeeFcfa,
      paymentMethod: input.paymentMethod,
      lines: input.lines,
    };
    this.orders.set(order.id, order);
    return order;
  }

  async getOrder(businessId: string, orderId: string) {
    const order = this.orders.get(orderId);
    return order && order.businessId === businessId ? order : null;
  }

  async updateOrderStatus(businessId: string, orderId: string, status: string): Promise<void> {
    const order = this.orders.get(orderId);
    if (order && order.businessId === businessId) {
      order.status = status;
      if (status === "confirmed") order.receivedAt = this.nowIso();
      if (status === "accepted") order.acceptedAt = this.nowIso();
    }
  }

  async createConfirmationToken(input: {
    businessId: string;
    orderId: string;
    tokenHash: string;
    summaryHash: string;
    expiresAt: string;
  }): Promise<ConfirmationTokenRecord> {
    const token: ConfirmationTokenRecord = {
      id: this.id("token"),
      businessId: input.businessId,
      orderId: input.orderId,
      tokenHash: input.tokenHash,
      summaryHash: input.summaryHash,
      expiresAt: input.expiresAt,
      usedAt: null,
      createdAt: this.nowIso(),
    };
    this.tokens.set(token.tokenHash, token);
    return token;
  }

  async getConfirmationTokenByHash(tokenHash: string) {
    return this.tokens.get(tokenHash) ?? null;
  }

  async consumeConfirmationToken(tokenId: string): Promise<boolean> {
    // Aucun await avant l'écriture : vérification et consommation sont
    // inséparables, comme la mise à jour conditionnelle en base.
    for (const token of this.tokens.values()) {
      if (token.id !== tokenId) continue;
      if (token.usedAt) return false;
      token.usedAt = this.nowIso();
      return true;
    }
    return false;
  }

  async logAudit(entry: AuditEntry): Promise<void> {
    this.audit.push(entry);
  }
}
