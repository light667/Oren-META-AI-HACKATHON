import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Client service_role : contourne la RLS.
 * SERVEUR UNIQUEMENT. Réservé à la création d'entreprise, aux
 * invitations et aux routes publiques limitées à une session.
 * Ne jamais importer depuis un composant client.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase non configuré : NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis.",
    );
  }
  return createSupabaseClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
