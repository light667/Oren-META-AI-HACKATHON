import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";

const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json", Prefer: "return=representation" };
const out = { slug: `e2e-live-${Date.now()}` };

async function post(path, body, headers = svc) {
  const r = await fetch(`${SB}${path}`, { method: "POST", headers, body: JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`POST ${path} -> ${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

const [biz] = await post("/rest/v1/businesses?select=id", {
  name: "E2E Live", slug: out.slug, business_type: "restaurant",
  config: { phone: "+228 90 00 00 00" }, enabled_capabilities: ["catalog_orders"],
});
out.businessId = biz.id;
const email = `patron-live-${Date.now()}@e2e-test.local`;
const password = `Test-${randomBytes(8).toString("hex")}!`;
out.ownerEmail = email;
const user = await post("/auth/v1/admin/users", { email, password, email_confirm: true });
out.ownerUserId = user.id;
await post("/rest/v1/staff", { user_id: user.id, business_id: biz.id, role: "owner", display_name: "Patron Live" });
await post("/rest/v1/business_info", {
  business_id: biz.id, address: "Agoè, Lomé",
  opening_hours: { lundi: "10h-22h", dimanche: "fermé" }, rules: "Paiement à la livraison.",
});
await post("/rest/v1/delivery_zones", { business_id: biz.id, neighborhood: "Agoè", fee_fcfa: 500 });
await post("/rest/v1/menu_items", [
  { business_id: biz.id, name: "Attiéké poulet", description: "Attiéké, poulet", price_fcfa: 2000, category: "attiéké", available: true },
  { business_id: biz.id, name: "Jus de gingembre", description: "50 cl", price_fcfa: 500, category: "boissons", available: true },
]);

// Session patron via le même mécanisme de cookies que l'application (@supabase/ssr).
const jar = new Map();
const supabase = createServerClient(SB, ANON, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
  },
});
const { error } = await supabase.auth.signInWithPassword({ email, password });
if (error) throw new Error(`signIn: ${error.message}`);
out.cookies = [...jar.entries()].map(([name, value]) => ({
  name, value, domain: "localhost", path: "/",
}));
writeFileSync("C:/Users/netha/AppData/Local/Temp/oren-live-setup.json", JSON.stringify(out, null, 2));
console.log(JSON.stringify({ slug: out.slug, businessId: out.businessId, cookies: out.cookies.length }));
