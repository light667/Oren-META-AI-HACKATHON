import type { z } from "zod";

/**
 * Registre d'outils par capacité (AGENTS.md).
 * Chaque capacité déclare ses outils ; l'assistant ne reçoit que les
 * outils des capacités activées pour l'entreprise. Tout autre appel
 * est refusé et journalisé.
 */
export interface ToolSpec {
  name: string;
  description: string;
  /** Schéma Zod des entrées, validé par le code avant exécution. */
  inputSchema: z.ZodType;
  access: "read" | "write";
  /** Une écriture exige un récapitulatif + un « oui » explicite (jeton unique). */
  requiresConfirmation: boolean;
}

export interface Capability {
  id: string; // ex. "catalog_orders"
  tools: ToolSpec[];
}

const capabilities = new Map<string, Capability>();

export function registerCapability(capability: Capability): void {
  capabilities.set(capability.id, capability);
}

export function toolsForCapabilities(capabilityIds: string[]): ToolSpec[] {
  return capabilityIds.flatMap((id) => capabilities.get(id)?.tools ?? []);
}
