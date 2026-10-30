import { NextResponse } from "next/server";
import { fr } from "@/i18n/fr";
import { getStaffContext, type StaffContext } from "@/lib/server-context";

export function jsonError(status: number, error: string): NextResponse {
  return NextResponse.json({ error }, { status });
}

/** Exige un membre connecté ; renvoie le contexte ou une réponse d'erreur. */
export async function requireStaff(): Promise<
  { ctx: StaffContext } | { response: NextResponse }
> {
  const ctx = await getStaffContext();
  if (!ctx) return { response: jsonError(401, fr.auth.callbackError) };
  return { ctx };
}

/** Exige le rôle owner (réglages) ; la RLS applique la même règle en base. */
export async function requireOwner(): Promise<
  { ctx: StaffContext } | { response: NextResponse }
> {
  const result = await requireStaff();
  if ("response" in result) return result;
  if (result.ctx.role !== "owner") {
    return { response: jsonError(403, fr.common.ownerOnly) };
  }
  return result;
}
