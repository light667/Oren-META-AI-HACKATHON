import { readFileSync } from "node:fs";
import { chromium } from "playwright-core";
const setup = JSON.parse(readFileSync("C:/Users/netha/AppData/Local/Temp/oren-live-setup.json", "utf8"));
const browser = await chromium.launch({
  executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  headless: true,
});
const ctx = await browser.newContext();
await ctx.addCookies(setup.cookies);
const page = await ctx.newPage();
page.on("console", (m) => console.log("console:", m.type(), m.text().slice(0, 200)));
page.on("pageerror", (e) => console.log("pageerror:", String(e).slice(0, 300)));
await page.goto("http://localhost:3200/app/commandes", { waitUntil: "networkidle", timeout: 60000 });
await new Promise((r) => setTimeout(r, 4000));
const text = await page.locator("body").innerText();
console.log("---- BODY ----");
console.log(text.slice(0, 1500));
await browser.close();
