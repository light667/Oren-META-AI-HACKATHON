import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
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
} from "./store";

/**
 * Implémentation Supabase du port du cœur (service_role, serveur).
 * C'est la route serveur du public : elle contourne la RLS mais ne
 * sert que la session demandée, et le cœur ne requiert que les
 * business_id explicitement fournis à chaque appel.
 */
export class SupabaseAssistantStore implements AssistantStore {
  private readonly db: SupabaseClient;

  constructor(client?: SupabaseClient) {
    this.db = client ?? createAdminClient();
  }

  async getBusiness(businessId: string): Promise<BusinessRecord | null> {
    const { data } = await this.db
      .from("businesses")
      .select("id, name, slug, business_type, enabled_capabilities, config")
      .eq("id", businessId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      slug: data.slug,
      businessType: data.business_type,
      enabledCapabilities: data.enabled_capabilities ?? [],
      config: data.config ?? {},
    };
  }

  async getBusinessInfo(businessId: string): Promise<BusinessInfoRecord | null> {
    const { data } = await this.db
      .from("business_info")
      .select("opening_hours, address, rules, free_text")
      .eq("business_id", businessId)
      .maybeSingle();
    if (!data) return null;
    return {
      openingHours: data.opening_hours ?? {},
      address: data.address,
      rules: data.rules,
      freeText: data.free_text,
    };
  }

  async listDeliveryZones(businessId: string): Promise<DeliveryZoneRecord[]> {
    const { data } = await this.db
      .from("delivery_zones")
      .select("id, neighborhood, fee_fcfa, is_active")
      .eq("business_id", businessId)
      .order("neighborhood");
    return (data ?? []).map((z) => ({
      id: z.id,
      neighborhood: z.neighborhood,
      feeFcfa: z.fee_fcfa,
      isActive: z.is_active,
    }));
  }

  async listMenuItems(businessId: string): Promise<MenuItemRecord[]> {
    const { data } = await this.db
      .from("menu_items")
      .select("id, name, description, price_fcfa, category, available")
      .eq("business_id", businessId)
      .order("category")
      .order("name");
    return (data ?? []).map((i) => ({
      id: i.id,
      name: i.name,
      description: i.description,
      priceFcfa: i.price_fcfa,
      category: i.category,
      available: i.available,
    }));
  }

  async getMenuItem(businessId: string, menuItemId: string): Promise<MenuItemRecord | null> {
    const { data } = await this.db
      .from("menu_items")
      .select("id, name, description, price_fcfa, category, available")
      .eq("business_id", businessId)
      .eq("id", menuItemId)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      priceFcfa: data.price_fcfa,
      category: data.category,
      available: data.available,
    };
  }

  async getOrCreateSession(businessId: string, anonymousId: string): Promise<SessionRecord> {
    const { data: existing } = await this.db
      .from("sessions")
      .select("id, business_id, customer_id, anonymous_id")
      .eq("business_id", businessId)
      .eq("anonymous_id", anonymousId)
      .maybeSingle();
    if (existing) {
      await this.db
        .from("sessions")
        .update({ last_seen_at: new Date().toISOString() })
        .eq("id", existing.id);
      return {
        id: existing.id,
        businessId: existing.business_id,
        customerId: existing.customer_id,
        anonymousId: existing.anonymous_id,
      };
    }
    const { data, error } = await this.db
      .from("sessions")
      .insert({ business_id: businessId, anonymous_id: anonymousId })
      .select("id, business_id, customer_id, anonymous_id")
      .single();
    if (error || !data) throw new Error("Impossible de créer la session.");
    return {
      id: data.id,
      businessId: data.business_id,
      customerId: data.customer_id,
      anonymousId: data.anonymous_id,
    };
  }

  async getOpenConversation(sessionId: string, channel: string): Promise<ConversationRecord | null> {
    const { data } = await this.db
      .from("conversations")
      .select("id, business_id, session_id, customer_id, channel, status, assistant_paused")
      .eq("session_id", sessionId)
      .eq("channel", channel)
      .in("status", ["en_cours", "a_reprendre"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data ? this.toConversation(data) : null;
  }

  async createConversation(input: {
    businessId: string;
    sessionId: string;
    customerId: string | null;
    channel: string;
  }): Promise<ConversationRecord> {
    const { data, error } = await this.db
      .from("conversations")
      .insert({
        business_id: input.businessId,
        session_id: input.sessionId,
        customer_id: input.customerId,
        channel: input.channel,
      })
      .select("id, business_id, session_id, customer_id, channel, status, assistant_paused")
      .single();
    if (error || !data) throw new Error("Impossible de créer la conversation.");
    return this.toConversation(data);
  }

  async updateConversation(
    conversationId: string,
    patch: { status?: ConversationRecord["status"]; assistantPaused?: boolean },
  ): Promise<void> {
    const update: Record<string, unknown> = {};
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.assistantPaused !== undefined) update.assistant_paused = patch.assistantPaused;
    await this.db.from("conversations").update(update).eq("id", conversationId);
  }

  private toConversation(data: Record<string, unknown>): ConversationRecord {
    return {
      id: String(data.id),
      businessId: String(data.business_id),
      sessionId: String(data.session_id),
      customerId: (data.customer_id as string | null) ?? null,
      channel: String(data.channel),
      status: data.status as ConversationRecord["status"],
      assistantPaused: Boolean(data.assistant_paused),
    };
  }

  async listMessages(conversationId: string, limit: number): Promise<MessageRecord[]> {
    const { data } = await this.db
      .from("messages")
      .select("id, conversation_id, sender_role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: false })
      .limit(limit);
    return (data ?? [])
      .map((m) => ({
        id: m.id,
        conversationId: m.conversation_id,
        senderRole: m.sender_role as MessageRecord["senderRole"],
        content: m.content,
        createdAt: m.created_at,
      }))
      .reverse();
  }

  async addMessage(input: {
    businessId: string;
    conversationId: string;
    senderRole: MessageRecord["senderRole"];
    content: string;
  }): Promise<MessageRecord> {
    const { data, error } = await this.db
      .from("messages")
      .insert({
        business_id: input.businessId,
        conversation_id: input.conversationId,
        sender_role: input.senderRole,
        content: input.content,
      })
      .select("id, conversation_id, sender_role, content, created_at")
      .single();
    if (error || !data) throw new Error("Impossible d'enregistrer le message.");
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderRole: data.sender_role as MessageRecord["senderRole"],
      content: data.content,
      createdAt: data.created_at,
    };
  }

  async getLastCustomerMessage(conversationId: string): Promise<MessageRecord | null> {
    const { data } = await this.db
      .from("messages")
      .select("id, conversation_id, sender_role, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("sender_role", "customer")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      conversationId: data.conversation_id,
      senderRole: "customer",
      content: data.content,
      createdAt: data.created_at,
    };
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
    const { data: order, error } = await this.db
      .from("orders")
      .insert({
        business_id: input.businessId,
        customer_id: input.customerId,
        session_id: input.sessionId,
        conversation_id: input.conversationId,
        status: "pending",
        total_fcfa: input.totalFcfa,
        delivery_fee_fcfa: input.deliveryFeeFcfa,
        payment_method: input.paymentMethod,
      })
      .select("id")
      .single();
    if (error || !order) throw new Error("Impossible de créer la commande.");
    const { error: itemsError } = await this.db.from("order_items").insert(
      input.lines.map((l) => ({
        business_id: input.businessId,
        order_id: order.id,
        menu_item_id: l.menuItemId,
        item_name: l.itemName,
        unit_price_fcfa: l.unitPriceFcfa,
        quantity: l.quantity,
        line_total_fcfa: l.lineTotalFcfa,
      })),
    );
    if (itemsError) throw new Error("Impossible d'enregistrer les lignes de commande.");
    return {
      id: order.id,
      businessId: input.businessId,
      sessionId: input.sessionId,
      conversationId: input.conversationId,
      status: "pending",
      totalFcfa: input.totalFcfa,
      deliveryFeeFcfa: input.deliveryFeeFcfa,
      paymentMethod: input.paymentMethod,
      lines: input.lines,
    };
  }

  async getOrder(businessId: string, orderId: string): Promise<OrderRecord | null> {
    const { data } = await this.db
      .from("orders")
      .select("id, business_id, session_id, conversation_id, status, total_fcfa, delivery_fee_fcfa, payment_method")
      .eq("business_id", businessId)
      .eq("id", orderId)
      .maybeSingle();
    if (!data) return null;
    const { data: items } = await this.db
      .from("order_items")
      .select("menu_item_id, item_name, unit_price_fcfa, quantity, line_total_fcfa")
      .eq("business_id", businessId)
      .eq("order_id", orderId);
    return {
      id: data.id,
      businessId: data.business_id,
      sessionId: data.session_id,
      conversationId: data.conversation_id,
      status: data.status,
      totalFcfa: data.total_fcfa,
      deliveryFeeFcfa: data.delivery_fee_fcfa,
      paymentMethod: data.payment_method,
      lines: (items ?? []).map((i) => ({
        menuItemId: i.menu_item_id,
        itemName: i.item_name,
        unitPriceFcfa: i.unit_price_fcfa,
        quantity: i.quantity,
        lineTotalFcfa: i.line_total_fcfa,
      })),
    };
  }

  async updateOrderStatus(businessId: string, orderId: string, status: string): Promise<void> {
    await this.db
      .from("orders")
      .update({ status })
      .eq("business_id", businessId)
      .eq("id", orderId);
  }

  async createConfirmationToken(input: {
    businessId: string;
    orderId: string;
    tokenHash: string;
    summaryHash: string;
    expiresAt: string;
  }): Promise<ConfirmationTokenRecord> {
    const { data, error } = await this.db
      .from("confirmation_tokens")
      .insert({
        business_id: input.businessId,
        order_id: input.orderId,
        token_hash: input.tokenHash,
        summary_hash: input.summaryHash,
        expires_at: input.expiresAt,
      })
      .select("id, business_id, order_id, token_hash, summary_hash, expires_at, used_at, created_at")
      .single();
    if (error || !data) throw new Error("Impossible de créer le jeton.");
    return {
      id: data.id,
      businessId: data.business_id,
      orderId: data.order_id,
      tokenHash: data.token_hash,
      summaryHash: data.summary_hash,
      expiresAt: data.expires_at,
      usedAt: data.used_at,
      createdAt: data.created_at,
    };
  }

  async getConfirmationTokenByHash(tokenHash: string): Promise<ConfirmationTokenRecord | null> {
    const { data } = await this.db
      .from("confirmation_tokens")
      .select("id, business_id, order_id, token_hash, summary_hash, expires_at, used_at, created_at")
      .eq("token_hash", tokenHash)
      .maybeSingle();
    if (!data) return null;
    return {
      id: data.id,
      businessId: data.business_id,
      orderId: data.order_id,
      tokenHash: data.token_hash,
      summaryHash: data.summary_hash,
      expiresAt: data.expires_at,
      usedAt: data.used_at,
      createdAt: data.created_at,
    };
  }

  async consumeConfirmationToken(tokenId: string): Promise<boolean> {
    // used_at est borné par created_at lu en base : la contrainte
    // « used_at >= created_at » tient même si l'horloge du serveur
    // applicatif est en retard sur celle de la base.
    const { data: existing } = await this.db
      .from("confirmation_tokens")
      .select("created_at")
      .eq("id", tokenId)
      .maybeSingle();
    if (!existing) return false;
    const createdAt = new Date(existing.created_at).getTime();
    const usedAt = new Date(Math.max(Date.now(), createdAt + 1)).toISOString();
    // Mise à jour conditionnelle : une seule requête peut faire passer
    // used_at de null à une date, même sous concurrence réelle.
    const { data } = await this.db
      .from("confirmation_tokens")
      .update({ used_at: usedAt })
      .eq("id", tokenId)
      .is("used_at", null)
      .select("id");
    return (data ?? []).length === 1;
  }

  async logAudit(entry: AuditEntry): Promise<void> {
    await this.db.from("audit_log").insert({
      business_id: entry.businessId,
      actor_type: entry.actorType,
      actor_id: entry.actorId,
      tool_name: entry.toolName,
      action: entry.action,
      input: entry.input,
      output: entry.output,
    });
  }
}
