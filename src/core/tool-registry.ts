import { z } from "zod";
import type { AssistantStore, BusinessRecord, ConversationRecord, SessionRecord } from "./store";

/**
 * Registre d'outils par capacité (AGENTS.md).
 * Chaque capacité déclare ses outils ; l'assistant ne reçoit que les
 * outils des capacités activées pour l'entreprise. Tout autre appel
 * est refusé et journalisé.
 */

export interface ToolContext {
  store: AssistantStore;
  business: BusinessRecord;
  session: SessionRecord;
  conversation: ConversationRecord;
}

export type ToolHandler = (
  ctx: ToolContext,
  args: never,
) => Promise<Record<string, unknown>>;

export interface ToolSpec {
  name: string;
  description: string;
  /** Schéma Zod des entrées, validé par le code avant exécution. */
  inputSchema: z.ZodType;
  access: "read" | "write";
  /** Une écriture exige un récapitulatif + un « oui » explicite (jeton unique). */
  requiresConfirmation: boolean;
  handler: ToolHandler;
}

export interface Capability {
  id: string; // ex. "catalog_orders"
  tools: ToolSpec[];
}

const capabilities = new Map<string, Capability>();

export function registerCapability(capability: Capability): void {
  capabilities.set(capability.id, capability);
}

export function getCapability(id: string): Capability | undefined {
  return capabilities.get(id);
}

export function toolsForCapabilities(capabilityIds: string[]): ToolSpec[] {
  return capabilityIds.flatMap((id) => capabilities.get(id)?.tools ?? []);
}

/** Convertit un ToolSpec au format d'outil attendu par le modèle. */
export function toToolDefinition(spec: ToolSpec): {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
} {
  const parameters = z.toJSONSchema(spec.inputSchema) as Record<string, unknown>;
  delete parameters.$schema;
  return { name: spec.name, description: spec.description, parameters };
}

export class ToolRefusal extends Error {
  readonly reason: string;
  constructor(reason: string) {
    super(reason);
    this.name = "ToolRefusal";
    this.reason = reason;
  }
}
