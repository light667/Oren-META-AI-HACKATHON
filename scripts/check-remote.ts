/**
 * Vérification du projet Supabase distant — vrais appels REST (PostgREST).
 * Usage : npm run check:remote
 *
 * Pré-requis : avoir collé supabase/apply_all.sql dans le SQL Editor
 * (Supabase Dashboard > SQL Editor > Run), une seule fois.
 *
 * Contrôles, OK ou ÉCHEC par table :
 * - clé anon : la lecture de chaque table ne doit renvoyer AUCUNE donnée
 *   (tableau vide ou erreur d'accès). Toute ligne renvoyée = ÉCHEC.
 * - clé service_role : chaque table doit exister (réponse 200), puis le
 *   seed de démonstration doit être présent (Chez Chef T, 8 plats, 3 zones,
 *   1 fiche info).
 *
 * Config (.env ou .env.local) : NEXT_PUBLIC_SUPABASE_URL,
 * NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
 * Code de sortie : 0 si tout passe, 1 sinon.
 */
import { existsSync, readFileSync } from "node:fs";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const TABLES = [
  "businesses",
  "staff",
  "business_info",
  "delivery_zones",
  "menu_items",
  "customers",
  "sessions",
  "conversations",
  "messages",
  "orders",
  "order_items",
  "confirmation_tokens",
  "audit_log",
  "push_subscriptions",
] as const;

const DEMO_BUSINESS_ID = "d0000000-0000-4000-8000-000000000001";

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/$/, "");
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

let failures = 0;

function report(scope: string, subject: string, ok: boolean, detail: string): void {
  if (!ok) failures += 1;
  console.log(`[${scope}] ${subject} : ${ok ? "OK" : "ÉCHEC"} — ${detail}`);
}

interface RestResult {
  status: number;
  rows: unknown[] | null;
  errorText: string;
}

async function restGet(path: string, key: string): Promise<RestResult> {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(15_000),
  });
  const text = await response.text();
  if (!response.ok) {
    return { status: response.status, rows: null, errorText: text.slice(0, 200) };
  }
  try {
    const parsed: unknown = JSON.parse(text);
    return {
      status: response.status,
      rows: Array.isArray(parsed) ? parsed : null,
      errorText: "",
    };
  } catch {
    return { status: response.status, rows: null, errorText: "réponse non JSON" };
  }
}

async function main(): Promise<void> {
  console.log("Vérification Supabase distant — vrais appels REST (aucun résultat simulé)");
  if (!baseUrl || !anonKey || !serviceKey) {
    const missing = [
      !baseUrl && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      !serviceKey && "SUPABASE_SERVICE_ROLE_KEY",
    ].filter(Boolean);
    console.log(`Configuration absente : ${missing.join(", ")} (dans .env ou .env.local)`);
    for (const table of TABLES) {
      report("anon", table, false, "configuration absente");
      report("service", table, false, "configuration absente");
    }
    process.exitCode = 1;
    return;
  }
  console.log(`Projet : ${baseUrl} (clés masquées)`);

  for (const table of TABLES) {
    // --- anon : aucune donnée ne doit fuiter ---------------------------------
    try {
      const anon = await restGet(`${table}?select=*&limit=5`, anonKey);
      if (anon.rows === null) {
        report("anon", table, true, `aucune donnée (erreur HTTP ${anon.status})`);
      } else if (anon.rows.length === 0) {
        report("anon", table, true, "aucune donnée (0 ligne renvoyée)");
      } else {
        report("anon", table, false, `${anon.rows.length} ligne(s) lisible(s) en anon : fuite`);
      }
    } catch (error) {
      report("anon", table, false, error instanceof Error ? error.message : String(error));
    }

    // --- service_role : la table doit exister --------------------------------
    try {
      const service = await restGet(`${table}?select=id&limit=1`, serviceKey);
      if (service.rows !== null) {
        report("service", table, true, `table présente (HTTP ${service.status})`);
      } else {
        report(
          "service",
          table,
          false,
          `HTTP ${service.status} ${service.errorText} — apply_all.sql a-t-il été exécuté ?`,
        );
      }
    } catch (error) {
      report("service", table, false, error instanceof Error ? error.message : String(error));
    }
  }

  // --- seed de démonstration (via service_role) -------------------------------
  try {
    const business = await restGet(
      `businesses?select=id,name,slug&slug=eq.chez-chef-t`,
      serviceKey,
    );
    const found = business.rows?.[0] as { name?: string } | undefined;
    report(
      "seed",
      "businesses/chez-chef-t",
      found?.name === "Chez Chef T",
      found ? `trouvé : ${found.name}` : "restaurant de démonstration introuvable",
    );

    const counts: [string, string, number][] = [
      ["menu_items", `menu_items?select=id&business_id=eq.${DEMO_BUSINESS_ID}&limit=50`, 8],
      ["delivery_zones", `delivery_zones?select=id&business_id=eq.${DEMO_BUSINESS_ID}&limit=50`, 3],
      ["business_info", `business_info?select=id&business_id=eq.${DEMO_BUSINESS_ID}&limit=50`, 1],
    ];
    for (const [label, path, expected] of counts) {
      const result = await restGet(path, serviceKey);
      const count = result.rows?.length ?? -1;
      report(
        "seed",
        label,
        count === expected,
        count >= 0 ? `${count} ligne(s), attendu ${expected}` : `HTTP ${result.status} ${result.errorText}`,
      );
    }
  } catch (error) {
    report("seed", "vérification", false, error instanceof Error ? error.message : String(error));
  }

  const total = TABLES.length * 2 + 4;
  console.log(
    failures === 0
      ? `Bilan : ${total}/${total} OK.`
      : `Bilan : ${total - failures}/${total} OK, ${failures} ÉCHEC(S).`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
