/**
 * Vérification réelle de chaque fournisseur LLM et de la chaîne de relais.
 * Usage : npm run check:llm   (vrais appels : consomme les clés, ne pas boucler)
 * Pour chaque fournisseur configuré : texte, appel d'outil, vision, transcription.
 * Puis la chaîne complète, telle que l'utilisent les routes de l'app.
 */
import { existsSync, readFileSync } from "node:fs";
import {
  createLlmProvider,
  GeminiLlmProvider,
  MetaLlmProvider,
  MistralLlmProvider,
  type LlmProvider,
} from "../src/providers/llm";

for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const has = (...names: string[]) => names.some((n) => Boolean(process.env[n]?.trim()));
const image = existsSync("test/menu.jpg")
  ? `data:image/jpeg;base64,${readFileSync("test/menu.jpg").toString("base64")}`
  : null;
const audio = existsSync("test/voix.wav") ? new Uint8Array(readFileSync("test/voix.wav")) : null;

const tool = {
  name: "get_menu",
  description: "Renvoie le menu du restaurant.",
  parameters: { type: "object", properties: {}, additionalProperties: false },
};

type Check = [string, (p: LlmProvider) => Promise<string>];
const checks: Check[] = [
  [
    "texte",
    async (p) => {
      const r = await p.chat([{ role: "user", content: "Réponds seulement : OK" }], { maxTokens: 20 });
      if (!r.content?.trim()) throw new Error("réponse vide");
      return r.content.trim().slice(0, 40);
    },
  ],
  [
    "outil",
    async (p) => {
      const r = await p.chat(
        [
          { role: "system", content: "Utilise l'outil get_menu pour toute question sur le menu." },
          { role: "user", content: "Qu'avez-vous au menu ?" },
        ],
        { tools: [tool], toolChoice: "auto" },
      );
      if (r.toolCalls[0]?.name !== "get_menu") throw new Error("aucun appel get_menu");
      return "get_menu appelé";
    },
  ],
  [
    "vision",
    async (p) => {
      if (!image) return "ignoré (test/menu.jpg absent)";
      const r = await p.chat(
        [
          {
            role: "user",
            content: [
              { type: "text", text: "Cite un plat visible sur cette photo, en 5 mots maximum." },
              { type: "image", url: image },
            ],
          },
        ],
        { maxTokens: 40 },
      );
      if (!r.content?.trim()) throw new Error("réponse vide");
      return r.content.trim().slice(0, 40);
    },
  ],
  [
    "transcription",
    async (p) => {
      if (!audio) return "ignoré (test/voix.wav absent)";
      const r = await p.transcribe({ data: audio, filename: "voix.wav", mimeType: "audio/wav", languageBias: ["French"] });
      if (!r.text.trim()) throw new Error("texte vide");
      return r.text.trim().slice(0, 40);
    },
  ],
];

const targets: Array<[string, LlmProvider | null]> = [
  ["meta", has("MODEL_API_KEY", "META_API_KEY") ? new MetaLlmProvider() : null],
  ["mistral", has("MISTRAL_API_KEY") ? new MistralLlmProvider() : null],
  ["gemini", has("GEMINI_API_KEY", "GOOGLE_GEMINI_API_KEY") ? new GeminiLlmProvider() : null],
  ["chaîne (app)", createLlmProvider()],
];

async function main() {
let failures = 0;
for (const [name, provider] of targets) {
  if (!provider) {
    console.log(`— ${name} : non configuré (clé absente)`);
    continue;
  }
  for (const [label, run] of checks) {
    try {
      console.log(`OK     ${name} / ${label} : ${await run(provider)}`);
    } catch (error) {
      if (name.startsWith("chaîne")) failures++;
      const msg = error instanceof Error ? error.message : String(error);
      console.log(`ÉCHEC  ${name} / ${label} : ${msg.slice(0, 160)}`);
    }
  }
}
console.log(failures ? `\nLa chaîne de l'app a échoué ${failures} fois.` : "\nChaîne de l'app : tout passe.");
process.exit(failures ? 1 : 0);
}

void main();
