import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export interface StaffContext {
  user: User;
  staffId: string;
  businessId: string;
  role: "owner" | "staff";
  business: {
    id: string;
    name: string;
    slug: string;
    business_type: string;
    enabled_capabilities: string[];
  };
}

/** Utilisateur connecté (session Supabase), ou null. */
export async function getCurrentUser(): Promise<User | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Contexte complet du membre connecté : sa ligne staff + son entreprise.
 * Les lectures passent par le client de session (RLS) : si la RLS ne
 * laisse rien passer, le contexte est null, comme il se doit.
 */
export async function getStaffContext(): Promise<StaffContext | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: staff } = await supabase
    .from("staff")
    .select("id, business_id, role")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!staff) return null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, slug, business_type, enabled_capabilities")
    .eq("id", staff.business_id)
    .maybeSingle();
  if (!business) return null;

  return {
    user,
    staffId: staff.id as string,
    businessId: staff.business_id as string,
    role: staff.role as "owner" | "staff",
    business: business as StaffContext["business"],
  };
}
