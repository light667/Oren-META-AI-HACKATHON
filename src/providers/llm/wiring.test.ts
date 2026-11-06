import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FallbackLlmProvider } from "./fallback";
import { withTimeout } from "./http";
import { createLlmProvider } from "./index";
import { MetaLlmProvider } from "./meta";
import { MistralLlmProvider, toMistralToolId } from "./mistral";

const ROOT = join(__dirname, "..", "..", "..");

describe("Relais LLM branché partout", () => {
  // Régression : la chaîne existait mais chaque route instanciait Meta seul.
  const callSites = [
    "src/core/handle-message.ts",
    "src/channels/web/server.ts",
    "src/app/api/import/interview/route.ts",
    "src/app/api/import/menu-photo/route.ts",
    "src/app/api/import/voice/route.ts",
  ];
  for (const file of callSites) {
    it(`${file} passe par createLlmProvider, jamais Meta en direct`, () => {
      const source = readFileSync(join(ROOT, file), "utf8");
      expect(source).toContain("createLlmProvider");
      expect(source).not.toMatch(/new MetaLlmProvider\(/);
    });
  }

  afterEach(() => vi.unstubAllEnvs());

  it("construit Meta → Mistral → Gemini quand les clés sont présentes", () => {
    vi.stubEnv("MODEL_API_KEY", "k1");
    vi.stubEnv("MISTRAL_API_KEY", "k2");
    vi.stubEnv("GEMINI_API_KEY", "k3");
    vi.stubEnv("LLM_PROVIDER_ORDER", "");
    const llm = createLlmProvider();
    expect(llm).toBeInstanceOf(FallbackLlmProvider);
    expect(llm.name).toBe("fallback:meta-model-api>mistral>gemini");
  });
});

describe("Délai maximal par appel", () => {
  it("interrompt un fournisseur muet puis le relais répond", async () => {
    const hanging: typeof fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
      });
    const meta = new MetaLlmProvider({ apiKey: "k", fetchFn: withTimeout(hanging, 50) });
    const mistral = new MistralLlmProvider({
      apiKey: "k",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            model: "ministral",
            choices: [{ message: { content: "Relais OK" }, finish_reason: "stop" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = await new FallbackLlmProvider([meta, mistral]).chat([
      { role: "user", content: "Bonjour" },
    ]);
    expect(result.content).toBe("Relais OK");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("Identifiants d'outils Mistral", () => {
  it("garde un identifiant déjà valide", () => {
    expect(toMistralToolId("abc123XYZ")).toBe("abc123XYZ");
  });

  it("convertit un identifiant Meta en 9 alphanumériques, de façon stable", () => {
    const id = toMistralToolId("call_9f8e7d6c-5b4a-3210");
    expect(id).toMatch(/^[a-zA-Z0-9]{9}$/);
    expect(toMistralToolId("call_9f8e7d6c-5b4a-3210")).toBe(id);
    expect(toMistralToolId("call_autre")).not.toBe(id);
  });

  it("envoie le même identifiant converti pour l'appel et sa réponse", async () => {
    let body: { messages: Array<Record<string, unknown>> } | null = null;
    const mistral = new MistralLlmProvider({
      apiKey: "k",
      fetchFn: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          JSON.stringify({ choices: [{ message: { content: "ok" }, finish_reason: "stop" }] }),
          { status: 200 },
        );
      },
    });
    await mistral.chat([
      { role: "user", content: "menu ?" },
      {
        role: "assistant",
        content: "",
        toolCalls: [{ id: "call_meta-long-id", name: "get_menu", arguments: "{}" }],
      },
      { role: "tool", content: "[]", toolCallId: "call_meta-long-id" },
    ]);
    const sent = body!.messages;
    const callId = (sent[1].tool_calls as Array<{ id: string }>)[0].id;
    expect(callId).toMatch(/^[a-zA-Z0-9]{9}$/);
    expect(sent[2].tool_call_id).toBe(callId);
  });
});
