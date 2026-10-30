import type { AssistantDeps } from "@/core/handle-message";
import { SupabaseAssistantStore } from "@/core/supabase-store";
import type { BusinessRecord } from "@/core/store";
import { MetaLlmProvider } from "@/providers/llm/meta";

/** Dépendances réelles du canal web (serveur uniquement). */
export function createWebDeps(): AssistantDeps {
  return { store: new SupabaseAssistantStore(), llm: new MetaLlmProvider() };
}

export async function resolveBusinessBySlug(
  deps: AssistantDeps,
  slug: string,
): Promise<BusinessRecord | null> {
  return deps.store.getBusinessBySlug(slug);
}

/** Numéro WhatsApp public de l'entreprise (config.phone), chiffres pour wa.me. */
export function whatsappNumber(business: BusinessRecord): string | null {
  const phone = business.config?.phone;
  if (typeof phone !== "string") return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
