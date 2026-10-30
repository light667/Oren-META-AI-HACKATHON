import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const setup = JSON.parse(readFileSync("C:/Users/netha/AppData/Local/Temp/oren-live-setup.json", "utf8"));
const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const svc = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };

// Nouveau mot de passe connu pour le patron de test, puis login frais.
const password = "Mesure-Live-2026!";
const put = await fetch(`${SB}/auth/v1/admin/users/${setup.ownerUserId}`, {
  method: "PUT", headers: svc, body: JSON.stringify({ password }),
});
console.log("password reset:", put.status);
const login = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: ANON, "Content-Type": "application/json" },
  body: JSON.stringify({ email: setup.ownerEmail, password }),
});
const session = await login.json();
console.log("login:", login.status, Boolean(session.access_token));

const supabase = createClient(SB, ANON, {
  global: { headers: { Authorization: `Bearer ${session.access_token}` } },
  realtime: { params: { eventsPerSecond: 10 } },
});
await supabase.realtime.setAuth(session.access_token);

const events = [];
const channel = supabase
  .channel("measure-orders")
  .on("postgres_changes",
    { event: "*", schema: "public", table: "orders", filter: `business_id=eq.${setup.businessId}` },
    (payload) => { events.push(payload.eventType); console.log("EVENT:", payload.eventType, payload.new?.status ?? payload.old?.status); })
  .subscribe((status) => console.log("channel status:", status));
await new Promise((r) => setTimeout(r, 4000));

// Déclencher un changement réel sur la commande existante.
const orders = await (await fetch(
  `${SB}/rest/v1/orders?select=id,status&business_id=eq.${setup.businessId}&limit=1`, { headers: svc },
)).json();
const order = orders[0];
console.log("order:", order);
const flip = order.status === "confirmed" ? "cancelled" : "confirmed";
// Repasser par pending puis confirmed pour simuler une arrivée si besoin.
await fetch(`${SB}/rest/v1/orders?id=eq.${order.id}`, {
  method: "PATCH", headers: svc, body: JSON.stringify({ status: flip }),
});
await new Promise((r) => setTimeout(r, 4000));
console.log("events received:", JSON.stringify(events));
await supabase.removeChannel(channel);
process.exit(0);
