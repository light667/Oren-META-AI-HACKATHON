/**
 * Smoke test Meta Model API — vrais appels, aucun contournement.
 * Usage : npm run smoke
 * Affiche OK ou ÉCHEC pour chacun des 5 tests (a)–(e), puis un bilan.
 * Code de sortie : 0 si tout passe, 1 sinon.
 *
 * Prérequis : MODEL_API_KEY dans .env.local (dashboard dev.meta.ai).
 * (d) lit test/menu.jpg. (e) cherche test/voix.wav, sinon test/voix.m4a
 * (conversion WAV via ffmpeg si présent), sinon SMOKE_AUDIO_PATH.
 */
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { basename, extname, join } from "node:path";
import { promisify } from "node:util";
import { z } from "zod";
import { MetaLlmProvider } from "../src/providers/llm/meta";
import { LlmProviderError } from "../src/providers/llm/types";

const execFileAsync = promisify(execFile);

// --- Chargement minimal de .env / .env.local (tsx ne charge pas Next env) ---
for (const file of [".env", ".env.local"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const provider = new MetaLlmProvider();
let failures = 0;

function report(id: string, label: string, ok: boolean, detail: string): void {
  if (!ok) failures += 1;
  console.log(`[${id}] ${ok ? "OK" : "ÉCHEC"} — ${label} : ${detail}`);
}

function detailOf(error: unknown): string {
  if (error instanceof LlmProviderError) {
    return `${error.message}${error.status ? ` (HTTP ${error.status})` : ""}${error.code ? ` [${error.code}]` : ""}`;
  }
  return error instanceof Error ? error.message : String(error);
}

function excerpt(text: string, max = 400): string {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

async function testTexte(): Promise<void> {
  const label = "réponse texte simple en français";
  try {
    const result = await provider.chat([
      {
        role: "user",
        content: "Réponds en français, en une phrase : quelle est la capitale du Togo ?",
      },
    ]);
    const text = result.content ?? "";
    if (!text.trim()) return report("a", label, false, "réponse vide");
    report("a", label, true, `modèle=${result.model} ; réponse=« ${excerpt(text, 200)} »`);
  } catch (error) {
    report("a", label, false, detailOf(error));
  }
}

async function testOutil(): Promise<void> {
  const label = "appel d'outil avec un outil factice";
  try {
    const result = await provider.chat(
      [
        {
          role: "user",
          content: "Donne-moi le prix du plat « attiéké poulet » en appelant l'outil.",
        },
      ],
      {
        tools: [
          {
            name: "obtenir_prix_plat",
            description: "Retourne le prix en FCFA d'un plat du catalogue (outil factice de test).",
            parameters: {
              type: "object",
              properties: {
                plat: { type: "string", description: "Nom du plat demandé" },
              },
              required: ["plat"],
              additionalProperties: false,
            },
          },
        ],
        toolChoice: { name: "obtenir_prix_plat" },
      },
    );
    const call = result.toolCalls[0];
    if (!call) {
      return report("b", label, false, `aucun tool_call reçu (content=${excerpt(result.content ?? "")})`);
    }
    report("b", label, true, `outil=${call.name} ; arguments=${call.arguments} ; finish=${result.finishReason}`);
  } catch (error) {
    report("b", label, false, detailOf(error));
  }
}

const platSchema = z.object({
  nom: z.string().min(1),
  prixFcfa: z.number().int().nonnegative(),
});

async function testJson(): Promise<void> {
  const label = "sortie JSON structurée (schéma validé par Zod)";
  try {
    const result = await provider.chat(
      [
        {
          role: "user",
          content: "Extrais le plat et son prix : « L'attiéké poulet coûte 2000 FCFA. »",
        },
      ],
      {
        responseFormat: {
          type: "json_schema",
          name: "PlatPrix",
          strict: true,
          schema: {
            type: "object",
            properties: {
              nom: { type: "string" },
              prixFcfa: { type: "integer", minimum: 0 },
            },
            required: ["nom", "prixFcfa"],
            additionalProperties: false,
          },
        },
      },
    );
    const parsed = platSchema.safeParse(JSON.parse(result.content ?? ""));
    if (!parsed.success) {
      return report("c", label, false, `JSON non conforme : ${excerpt(result.content ?? "")}`);
    }
    report("c", label, true, `JSON valide=${JSON.stringify(parsed.data)}`);
  } catch (error) {
    report("c", label, false, detailOf(error));
  }
}

async function testImage(): Promise<void> {
  const label = "envoi d'une image (test/menu.jpg) et lecture texte + prix";
  const path = join("test", "menu.jpg");
  try {
    if (!existsSync(path)) return report("d", label, false, `fichier absent : ${path}`);
    const dataUrl = `data:image/jpeg;base64,${readFileSync(path).toString("base64")}`;
    const result = await provider.chat([
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "Lis ce menu de restaurant. Liste les plats que tu vois avec leur prix en FCFA, tels qu'écrits sur l'image. Si un prix est illisible, écris « illisible » plutôt que d'inventer.",
          },
          { type: "image", url: dataUrl },
        ],
      },
    ]);
    const text = result.content ?? "";
    if (!text.trim()) return report("d", label, false, "réponse vide");
    const hasPrice = /\d/.test(text);
    report(
      "d",
      label,
      hasPrice,
      hasPrice
        ? `texte lu avec prix : « ${excerpt(text)} »`
        : `texte sans aucun prix détecté : « ${excerpt(text)} »`,
    );
  } catch (error) {
    report("d", label, false, detailOf(error));
  }
}

async function findAudio(): Promise<{ path: string; isWav: boolean } | null> {
  const fromEnv = process.env.SMOKE_AUDIO_PATH?.trim();
  const candidates = [
    ...(fromEnv ? [fromEnv] : []),
    join("test", "voix.wav"),
    join("test", "voix.m4a"),
    join("test", "voix.mp3"),
    join("test", "voix.ogg"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return { path: candidate, isWav: extname(candidate).toLowerCase() === ".wav" };
    }
  }
  return null;
}

async function toWav(input: string): Promise<string> {
  const output = join("test", ".smoke-voix-converti.wav");
  await execFileAsync("ffmpeg", [
    "-y", "-i", input, "-ac", "1", "-ar", "24000",
    "-c:a", "pcm_s16le", "-map_metadata", "-1", output,
  ]);
  return output;
}

async function testAudio(): Promise<void> {
  const label = "transcription d'un fichier audio";
  try {
    const found = await findAudio();
    if (!found) {
      return report(
        "e",
        label,
        false,
        "aucun fichier audio : déposez test/voix.wav (WAV PCM mono 16/24 kHz) ou test/voix.m4a, ou définissez SMOKE_AUDIO_PATH",
      );
    }
    let wavPath = found.path;
    if (!found.isWav) {
      try {
        wavPath = await toWav(found.path);
      } catch {
        return report(
          "e",
          label,
          false,
          `« ${found.path} » n'est pas un WAV et la conversion a échoué (ffmpeg absent ?). L'endpoint exige un WAV PCM mono 16 bits 16/24 kHz : ffmpeg -i ${basename(found.path)} -ac 1 -ar 24000 -c:a pcm_s16le sortie.wav`,
        );
      }
    }
    const result = await provider.transcribe({
      data: readFileSync(wavPath),
      filename: basename(wavPath),
      languageBias: ["French"],
    });
    if (!result.text.trim()) return report("e", label, false, "transcription vide");
    report("e", label, true, `fichier=${wavPath} ; transcription=« ${excerpt(result.text, 300)} »`);
  } catch (error) {
    report("e", label, false, detailOf(error));
  }
}

async function main(): Promise<void> {
  const hasKey = Boolean(process.env.MODEL_API_KEY?.trim() || process.env.META_API_KEY?.trim());
  console.log("Smoke Meta Model API — vrais appels (aucun résultat simulé)");
  console.log(
    hasKey
      ? "Clé API : présente (valeur masquée)."
      : "Clé API : ABSENTE (MODEL_API_KEY) — les appels réels vont échouer, c'est le résultat honnête.",
  );
  await testTexte();
  await testOutil();
  await testJson();
  await testImage();
  await testAudio();
  console.log(
    failures === 0
      ? "Bilan : 5/5 OK."
      : `Bilan : ${5 - failures}/5 OK, ${failures} ÉCHEC(S). Voir docs/API_NOTES.md.`,
  );
  process.exitCode = failures === 0 ? 0 : 1;
}

void main();
