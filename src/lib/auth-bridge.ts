import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { FirebaseIdentity } from "@/lib/firebase/verify-token";

/**
 * Passerelle Firebase → Supabase.
 * Firebase prouve l'identité (e-mail vérifié). Chaque compte Firebase est
 * relié à UN compte Supabase (auth.users) qui lui est propre : c'est lui
 * qui porte la RLS (auth.uid()), le rôle staff et l'entreprise. Aucun
 * e-mail n'est envoyé par Supabase : la session est ouverte avec un jeton
 * à usage unique généré côté serveur (admin.generateLink, sans envoi).
 */

export interface SignupMetadata {
  business_name?: string;
  business_type?: string;
  slug?: string;
  phone?: string;
}

export type LinkResult =
  | { ok: true; user: User; created: boolean }
  | { ok: false; reason: "email_mismatch" | "error" };

async function findUserIdByEmail(admin: SupabaseClient, email: string): Promise<string | null> {
  const { data, error } = await admin.rpc("auth_user_id_by_email", { p_email: email });
  if (error) throw error;
  return typeof data === "string" ? data : null;
}

/**
 * Retrouve ou crée le compte Supabase relié à ce compte Firebase.
 * Ordre : liaison existante (firebase_uid) → compte existant de même
 * e-mail (comptes d'avant la migration, invités) → nouveau compte.
 * N'est appelé qu'avec un e-mail vérifié par Firebase : relier par
 * e-mail est donc sûr (la personne contrôle cette boîte).
 */
export async function linkFirebaseIdentity(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  signup?: SignupMetadata,
): Promise<LinkResult> {
  const { data: link } = await admin
    .from("auth_identities")
    .select("user_id, email")
    .eq("firebase_uid", identity.uid)
    .maybeSingle();

  let userId = (link?.user_id as string | undefined) ?? null;
  let created = false;

  if (!userId) {
    userId = await findUserIdByEmail(admin, identity.email);
  }

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: identity.email,
      email_confirm: true,
      user_metadata: { ...(signup ?? {}) },
      app_metadata: { firebase_uid: identity.uid, auth_provider: "firebase" },
    });
    if (error || !data.user) return { ok: false, reason: "error" };
    userId = data.user.id;
    created = true;
  }

  const { data: fetched, error: fetchError } = await admin.auth.admin.getUserById(userId);
  if (fetchError || !fetched.user) return { ok: false, reason: "error" };
  let user = fetched.user;

  // Le compte Supabase doit porter l'e-mail vérifié par Firebase. Si
  // l'e-mail Firebase a changé, on aligne ; si un autre compte Supabase
  // porte déjà ce nouvel e-mail, on refuse plutôt que de fusionner.
  if ((user.email ?? "").toLowerCase() !== identity.email) {
    const other = await findUserIdByEmail(admin, identity.email);
    if (other && other !== userId) return { ok: false, reason: "email_mismatch" };
    const { data: updated, error } = await admin.auth.admin.updateUserById(userId, {
      email: identity.email,
      email_confirm: true,
    });
    if (error || !updated.user) return { ok: false, reason: "error" };
    user = updated.user;
  }

  // Données d'inscription (nom, lien, téléphone) : complètent les
  // métadonnées sans écraser celles d'une invitation (business_id).
  if (!created && signup && Object.keys(signup).length && !user.user_metadata?.business_id) {
    const { data: updated } = await admin.auth.admin.updateUserById(userId, {
      user_metadata: { ...(user.user_metadata ?? {}), ...signup },
    });
    if (updated.user) user = updated.user;
  }

  const { error: upsertError } = await admin.from("auth_identities").upsert(
    {
      firebase_uid: identity.uid,
      user_id: userId,
      email: identity.email,
      provider: identity.provider,
      last_sign_in_at: new Date().toISOString(),
    },
    { onConflict: "firebase_uid" },
  );
  if (upsertError) return { ok: false, reason: "error" };

  return { ok: true, user, created };
}

/**
 * Jeton à usage unique (sans envoi d'e-mail) pour ouvrir la session
 * Supabase côté serveur via verifyOtp({ type: "email", token_hash }).
 */
export async function createSessionTokenHash(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error) return null;
  return data.properties?.hashed_token ?? null;
}
