import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright-core";

const setup = JSON.parse(readFileSync("C:/Users/netha/AppData/Local/Temp/oren-live-setup.json", "utf8"));
const env = {};
for (const line of readFileSync(".env", "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const SB = env.NEXT_PUBLIC_SUPABASE_URL;
const SVC = env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = "http://localhost:3200";
const result = { slug: setup.slug };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
  args: ["--autoplay-policy=no-user-gesture-required", "--mute-audio"],
});
try {
  // --- Patron : tableau ouvert, abonné Realtime, son instrumenté -----------
  const ownerCtx = await browser.newContext();
  await ownerCtx.addCookies(setup.cookies);
  await ownerCtx.addInitScript(() => {
    window.__soundStarts = 0;
    const Original = window.AudioContext;
    if (Original) {
      window.AudioContext = class extends Original {
        createOscillator(...args) {
          const osc = super.createOscillator(...args);
          const start = osc.start.bind(osc);
          osc.start = (...a) => { window.__soundStarts += 1; return start(...a); };
          return osc;
        }
      };
    }
  });
  const ownerPage = await ownerCtx.newPage();
  await ownerPage.goto(`${BASE}/app/commandes`, { waitUntil: "networkidle", timeout: 60000 });
  result.ownerPageTitle = await ownerPage.locator("h1").first().textContent().catch(() => null);
  await sleep(2500); // laisser l'abonnement Realtime s'établir

  // --- Client : vraie page publique, vrai modèle ----------------------------
  const clientCtx = await browser.newContext();
  const clientPage = await clientCtx.newPage();
  let confirmResponseAt = 0;
  clientPage.on("response", (res) => {
    if (res.url().includes("/confirm") && res.request().method() === "POST") {
      confirmResponseAt = Date.now();
    }
  });
  await clientPage.goto(`${BASE}/${setup.slug}`, { waitUntil: "networkidle", timeout: 60000 });
  result.clientGreetingVisible = await clientPage.getByText("assistant IA", { exact: false }).first().isVisible().catch(() => false);

  const tChatStart = Date.now();
  await clientPage.getByPlaceholder("Écrivez votre message").fill(
    "Je voudrais commander 2 attiéké poulet et 1 jus de gingembre, livrés à Agoè.",
  );
  await clientPage.getByRole("button", { name: "Envoyer" }).click();
  // Carte de récapitulatif (prepare_order a chiffré en code : 5000 FCFA).
  await clientPage.getByText("Votre commande").waitFor({ timeout: 180000 });
  result.chatToCardMs = Date.now() - tChatStart;
  result.cardText = (await clientPage.locator("text=Total :").first().textContent().catch(() => "") ?? "").trim();

  await clientPage.locator("#cust-name").fill("Cliente Mesure Live");
  await clientPage.locator("#cust-phone").fill("+228 97 66 55 44");
  await clientPage.getByRole("button", { name: /Je confirme/ }).click();
  await clientPage.getByText("Commande confirmée").waitFor({ timeout: 60000 });
  result.clientConfirmedAt = confirmResponseAt || Date.now();
  result.clientStatusAfterConfirm = await clientPage.getByText("Statut de votre commande").textContent().catch(() => null);
  await clientPage.evaluate(() => { window.__noReloadMarker = "still-here"; });

  // --- Apparition chez le patron (Realtime) --------------------------------
  const tWaitStart = Date.now();
  await ownerPage.getByText("5000").first().waitFor({ timeout: 30000 });
  result.ownerAppearanceMs = Date.now() - result.clientConfirmedAt;
  result.ownerWaitObservedMs = Date.now() - tWaitStart;
  result.soundStarts = await ownerPage.evaluate(() => window.__soundStarts ?? 0);
  result.ownerCardVisible = true;

  // --- Le patron accepte ----------------------------------------------------
  await ownerPage.getByRole("button", { name: "Accepter" }).first().click();
  await ownerPage.getByText("Acceptée").first().waitFor({ timeout: 30000 });
  result.ownerAcceptedVisible = true;

  // --- Retour du statut côté client, sans rechargement ----------------------
  await clientPage.getByText("Acceptée").waitFor({ timeout: 30000 });
  result.clientSawAccepted = true;
  result.clientMarkerIntact = await clientPage.evaluate(() => window.__noReloadMarker === "still-here");

  // --- Délai d'acceptation enregistré en base ------------------------------
  const headers = { apikey: SVC, Authorization: `Bearer ${SVC}` };
  const orders = await (await fetch(
    `${SB}/rest/v1/orders?select=id,status,total_fcfa,received_at,accepted_at,created_at&business_id=eq.${setup.businessId}&order=created_at.desc&limit=5`,
    { headers },
  )).json();
  const order = orders.find((o) => o.status === "accepted" || o.accepted_at);
  result.orderInDb = order ?? null;
  if (order?.received_at && order?.accepted_at) {
    result.acceptanceDelayMs =
      new Date(order.accepted_at).getTime() - new Date(order.received_at).getTime();
  }
  const customers = await (await fetch(
    `${SB}/rest/v1/customers?select=name,phone,phone_verified_at&business_id=eq.${setup.businessId}`,
    { headers },
  )).json();
  result.customerInDb = customers[0] ?? null;
} catch (e) {
  result.error = String(e?.message ?? e).slice(0, 600);
} finally {
  await browser.close();
}
writeFileSync("C:/Users/netha/AppData/Local/Temp/oren-live-result.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
