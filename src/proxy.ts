import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Rafraîchit la session Supabase (cookies) avant l'espace patron.
 * Les Server Components ne peuvent pas réécrire les cookies : sans ce
 * passage, un jeton d'accès expiré (1 h) déconnecterait le patron.
 * Aucune décision d'accès ici : la RLS et getStaffContext décident.
 */
export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let response = NextResponse.next({ request });
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });
  await supabase.auth.getUser().catch(() => null);
  return response;
}

export const config = {
  matcher: [
    "/app/:path*",
    "/bienvenue",
    "/api/((?!chat|cron|auth/session).*)",
  ],
};
