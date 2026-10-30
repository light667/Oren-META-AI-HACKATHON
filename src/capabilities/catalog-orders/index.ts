import type { Capability } from "@/core/tool-registry";

/**
 * Capacité catalog_orders : catalogue + commandes.
 * Les outils (lire le catalogue, créer une commande après confirmation)
 * seront déclarés ici dans la tâche « commandes ».
 */
export const catalogOrdersCapability: Capability = {
  id: "catalog_orders",
  tools: [],
};
