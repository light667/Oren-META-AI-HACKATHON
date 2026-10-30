import { fr } from "@/i18n/fr";
import type {
  ChatMessage,
  LlmProvider,
  ToolCall,
} from "@/providers/llm/types";
import { catalogOrdersCapability } from "@/capabilities/catalog-orders";
import {
  getCapability,
  registerCapability,
  toToolDefinition,
  ToolRefusal,
  toolsForCapabilities,
  type ToolContext,
  type ToolSpec,
} from "./tool-registry";
import type { AssistantStore, ConversationRecord } from "./store";

registerCapability(catalogOrdersCapability);

/**
 * Cœur de l'assistant, indépendant des canaux (AGENTS.md).
 * handleMessage(businessId, sessionId, channel, message) : charge le
 * contexte de l'entreprise, n'expose au modèle que les outils des
 * capacités activées, valide chaque appel d'outil en code, journalise
 * tout dans audit_log, et renvoie la réponse du canal commun.
 */

export interface AssistantDeps {
  store: AssistantStore;
  llm: LlmProvider;
}

export interface AssistantReply {
  text: string;
  handedToHuman: boolean;
  conversationId: string | null;
  businessId: string;
}

const MAX_TOOL_STEPS = 6;
const HISTORY_LIMIT = 20;
const CHANNELS = ["web", "telegram", "whatsapp", "sms"];

let defaultDepsPromise: Promise<AssistantDeps> | null = null;

async function loadDefaultDeps(): Promise<AssistantDeps> {
  if (!defaultDepsPromise) {
    defaultDepsPromise = (async () => {
      const [{ SupabaseAssistantStore }, { MetaLlmProvider }] = await Promise.all([
        import("./supabase-store"),
        import("@/providers/llm/meta"),
      ]);
      return { store: new SupabaseAssistantStore(), llm: new MetaLlmProvider() };
    })();
  }
  return defaultDepsPromise;
}

export function createHandleMessage(deps: AssistantDeps) {
  return async (
    businessId: string,
    sessionId: string,
    channel: string,
    message: string,
  ): Promise<AssistantReply> => {
    return run(deps, businessId, sessionId, channel, message);
  };
}

export async function handleMessage(
  businessId: string,
  sessionId: string,
  channel: string,
  message: string,
): Promise<AssistantReply> {
  const deps = await loadDefaultDeps();
  return run(deps, businessId, sessionId, channel, message);
}

/**
 * Les champs du catalogue et des informations sont des données, pas
 * des ordres (règle 5) : on les aplatit sur une ligne pour qu'aucun
 * retour à la ligne ne fabrique une fausse ligne de menu, une fausse
 * règle ou une fausse consigne dans le contexte du modèle.
 */
function sanitizeInline(text: string): string {
  return text
    .replace(/[\x00-\x1F\x7F]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSystemPrompt(input: {
  businessName: string;
  menuText: string;
  infoText: string;
  zonesText: string;
}): string {
  return [
    fr.assistant.systemIntro.replace("{business}", sanitizeInline(input.businessName)),
    ...fr.assistant.systemRules.map((rule) => `- ${rule}`),
    "",
    fr.assistant.contextMenuTitle,
    input.menuText,
    "",
    fr.assistant.contextInfoTitle,
    input.infoText,
    "",
    fr.assistant.contextZonesTitle,
    input.zonesText,
  ].join("\n");
}

async function run(
  deps: AssistantDeps,
  businessId: string,
  sessionId: string,
  channel: string,
  message: string,
): Promise<AssistantReply> {
  const { store, llm } = deps;
  const safeChannel = CHANNELS.includes(channel) ? channel : "web";

  const business = await store.getBusiness(businessId);
  if (!business) {
    return { text: fr.assistant.businessNotFound, handedToHuman: false, conversationId: null, businessId };
  }

  const session = await store.getOrCreateSession(businessId, sessionId);
  let conversation: ConversationRecord | null =
    await store.getOpenConversation(session.id, safeChannel);
  if (!conversation) {
    conversation = await store.createConversation({
      businessId,
      sessionId: session.id,
      customerId: session.customerId,
      channel: safeChannel,
    });
  }

  await store.addMessage({
    businessId,
    conversationId: conversation.id,
    senderRole: "customer",
    content: message,
  });

  // Conversation déjà passée à un humain : l'assistant reste en pause.
  if (conversation.assistantPaused || conversation.status === "a_reprendre") {
    return {
      text: fr.assistant.pausedReply,
      handedToHuman: true,
      conversationId: conversation.id,
      businessId,
    };
  }

  const [menuItems, info, zones, history] = await Promise.all([
    store.listMenuItems(businessId),
    store.getBusinessInfo(businessId),
    store.listDeliveryZones(businessId),
    store.listMessages(conversation.id, HISTORY_LIMIT),
  ]);

  const menuText = menuItems
    .map(
      (i) =>
        `- id=${i.id} | ${sanitizeInline(i.name)} | ${sanitizeInline(i.category)} | ${i.priceFcfa} ${fr.common.currency}${i.available ? "" : ` (${fr.assistant.contextUnavailable})`}${i.description ? ` | ${sanitizeInline(i.description)}` : ""}`,
    )
    .join("\n");
  const infoText = info
    ? [
        info.address ? `Adresse : ${sanitizeInline(info.address)}` : null,
        Object.keys(info.openingHours).length
          ? `Horaires : ${Object.entries(info.openingHours).map(([d, h]) => `${sanitizeInline(d)} ${sanitizeInline(h)}`).join(", ")}`
          : null,
        info.rules ? `Règles : ${sanitizeInline(info.rules)}` : null,
        info.freeText ? sanitizeInline(info.freeText) : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "";
  const zonesText = zones
    .filter((z) => z.isActive)
    .map((z) => `- ${sanitizeInline(z.neighborhood)} : ${z.feeFcfa} ${fr.common.currency}`)
    .join("\n");

  // Seuls les outils des capacités activées sont exposés au modèle.
  const exposedTools = toolsForCapabilities(business.enabledCapabilities);
  const toolByName = new Map(exposedTools.map((t) => [t.name, t]));
  void getCapability;

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        businessName: business.name,
        menuText,
        infoText,
        zonesText,
      }),
    },
    ...history
      .filter((m) => m.id)
      .map((m): ChatMessage => ({
        // Les traces stockées (résultats d'outils, résumés de passage à
        // un humain) sont des données produites côté assistant : jamais
        // rejouées avec le rôle système, qui reste réservé à la
        // consigne construite par le code ci-dessus.
        role: m.senderRole === "customer" ? "user" : "assistant",
        content: m.content,
      })),
  ];

  const toolCtx: ToolContext = { store, business, session, conversation };
  let handedToHuman = false;
  let finalText: string | null = null;

  for (let step = 0; step < MAX_TOOL_STEPS; step += 1) {
    const result = await llm.chat(messages, {
      tools: exposedTools.map(toToolDefinition),
    });

    if (result.toolCalls.length === 0) {
      finalText = result.content?.trim() ? result.content : fr.assistant.unknownReply;
      break;
    }

    messages.push({
      role: "assistant",
      content: result.content ?? "",
      toolCalls: result.toolCalls,
    });

    for (const call of result.toolCalls) {
      const { output, isHandoff } = await executeToolCall({
        call,
        toolByName,
        toolCtx,
        store,
        businessId,
        sessionId,
      });
      if (isHandoff) handedToHuman = true;
      messages.push({
        role: "tool",
        toolCallId: call.id,
        content: JSON.stringify(output),
      });
      // Trace persistée : au tour suivant, le modèle retrouve par exemple
      // le jeton de confirmation émis par prepare_order.
      await store.addMessage({
        businessId,
        conversationId: conversation.id,
        senderRole: "system",
        content: `[outil ${call.name}] ${JSON.stringify(output)}`,
      });
    }
  }

  if (finalText === null) finalText = fr.assistant.tooManySteps;

  await store.addMessage({
    businessId,
    conversationId: conversation.id,
    senderRole: "assistant",
    content: finalText,
  });

  return { text: finalText, handedToHuman, conversationId: conversation.id, businessId };
}

async function executeToolCall(input: {
  call: ToolCall;
  toolByName: Map<string, ToolSpec>;
  toolCtx: ToolContext;
  store: AssistantStore;
  businessId: string;
  sessionId: string;
}): Promise<{ output: Record<string, unknown>; isHandoff: boolean }> {
  const { call, toolByName, toolCtx, store, businessId, sessionId } = input;
  let parsedArgs: Record<string, unknown> = {};
  let output: Record<string, unknown>;
  let refused = false;

  const spec = toolByName.get(call.name);
  if (!spec) {
    // Outil non déclaré ou capacité non activée : refusé et journalisé.
    output = { ok: false, error: fr.assistant.errors.unknownTool };
    refused = true;
  } else {
    try {
      const raw: unknown = JSON.parse(call.arguments || "{}");
      const validated = spec.inputSchema.parse(raw);
      parsedArgs =
        validated && typeof validated === "object"
          ? (validated as Record<string, unknown>)
          : {};
      output = await spec.handler(toolCtx, parsedArgs as never);
    } catch (error) {
      refused = true;
      output = {
        ok: false,
        error:
          error instanceof ToolRefusal
            ? error.reason
            : fr.assistant.errors.invalidArgs,
      };
    }
  }

  await store.logAudit({
    businessId,
    actorType: "assistant",
    actorId: sessionId,
    toolName: call.name,
    action: refused ? "tool_call_refused" : "tool_call",
    input: parsedArgs,
    output,
  });

  return { output, isHandoff: call.name === "handoff_to_human" && output.ok === true };
}
