import { describe, expect, it, vi } from "vitest";
import { FallbackLlmProvider } from "./fallback";
import { GeminiLlmProvider } from "./gemini";
import { MistralLlmProvider } from "./mistral";
import { FakeLlmProvider } from "./fake";
import {
  LlmProviderError,
  type ChatResult,
  type LlmProvider,
  type TranscribeResult,
} from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stub(name: string, failChat?: boolean, failTranscribe?: boolean): LlmProvider {
  return {
    name,
    chat: vi.fn(async (): Promise<ChatResult> => {
      if (failChat) throw new LlmProviderError("quota épuisé", { status: 429, code: "QUOTA" });
      return { content: `ok-${name}`, toolCalls: [], finishReason: "stop", model: name, raw: null };
    }),
    transcribe: vi.fn(async (): Promise<TranscribeResult> => {
      if (failTranscribe)
        throw new LlmProviderError("format non accepté", { code: "UNSUPPORTED_AUDIO_FORMAT" });
      return { text: `texte-${name}`, turns: [], model: name, raw: null };
    }),
  };
}

describe("FallbackLlmProvider", () => {
  it("bascule sur le suivant quand le premier est en quota (429)", async () => {
    const chain = new FallbackLlmProvider([stub("meta", true), stub("mistral"), stub("gemini")]);
    const result = await chain.chat([{ role: "user", content: "Bonjour" }]);
    expect(result.content).toBe("ok-mistral");
  });

  it("bascule en transcription quand le premier n'est pas adapté (non-WAV)", async () => {
    const chain = new FallbackLlmProvider([
      stub("meta", false, true),
      stub("mistral"),
    ]);
    const result = await chain.transcribe({ data: new Uint8Array([1]), filename: "voix.m4a" });
    expect(result.text).toBe("texte-mistral");
  });

  it("échoue explicitement si tous échouent, sans inventer de réponse", async () => {
    const chain = new FallbackLlmProvider([stub("meta", true), stub("mistral", true)]);
    const err = await chain.chat([{ role: "user", content: "x" }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).code).toBe("ALL_PROVIDERS_FAILED");
    expect((err as Error).message).toContain("meta");
    expect((err as Error).message).toContain("mistral");
  });

  it("n'appelle pas les suivants si le premier réussit", async () => {
    const first = stub("meta");
    const second = stub("mistral");
    const chain = new FallbackLlmProvider([first, second]);
    await chain.chat([{ role: "user", content: "x" }]);
    expect(second.chat).not.toHaveBeenCalled();
  });
});

describe("MistralLlmProvider", () => {
  it("chat : format OpenAI, outils et tool_choice forcé accepté", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        model: "mistral-large-latest",
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              content: null,
              tool_calls: [
                { id: "c1", type: "function", function: { name: "prix", arguments: '{"a":1}' } },
              ],
            },
          },
        ],
      }),
    );
    const provider = new MistralLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.chat([{ role: "user", content: "Prix ?" }], {
      tools: [{ name: "prix", description: "d", parameters: { type: "object" } }],
      toolChoice: { name: "prix" },
    });
    expect(result.toolCalls).toEqual([{ id: "c1", name: "prix", arguments: '{"a":1}' }]);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.mistral.ai/v1/chat/completions");
    const sent = JSON.parse(String(init.body));
    expect(sent.tool_choice).toEqual({ type: "function", function: { name: "prix" } });
  });

  it("transcribe : endpoint Voxtral multipart, lit text", async () => {
    const fetchFn = vi.fn(async () => jsonResponse({ text: "Bonjour Lomé" }));
    const provider = new MistralLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.transcribe({
      data: new Uint8Array([1, 2]),
      filename: "voix.m4a",
      mimeType: "audio/mp4",
    });
    expect(result.text).toBe("Bonjour Lomé");
    expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://api.mistral.ai/v1/audio/transcriptions",
    );
  });
});

describe("GeminiLlmProvider", () => {
  it("chat : generateContent, functionCall converti en ToolCall", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        candidates: [
          {
            finishReason: "STOP",
            content: { parts: [{ functionCall: { name: "prix", args: { a: 1 } } }] },
          },
        ],
        usageMetadata: { totalTokenCount: 9 },
      }),
    );
    const provider = new GeminiLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.chat(
      [
        { role: "system", content: "Tu es Oren." },
        { role: "user", content: "Prix ?" },
      ],
      { tools: [{ name: "prix", description: "d", parameters: { type: "object" } }] },
    );
    expect(result.toolCalls[0]).toMatchObject({ name: "prix", arguments: '{"a":1}' });
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("/models/gemini-2.5-flash:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("k");
    const sent = JSON.parse(String(init.body));
    expect(sent.systemInstruction.parts[0].text).toBe("Tu es Oren.");
    expect(sent.tools[0].functionDeclarations[0].name).toBe("prix");
  });

  it("sans clé : erreur explicite MISSING_API_KEY", async () => {
    const provider = new GeminiLlmProvider({
      apiKey: "",
      fetchFn: vi.fn() as unknown as typeof fetch,
    });
    await expect(provider.chat([{ role: "user", content: "x" }])).rejects.toMatchObject({
      code: "MISSING_API_KEY",
    });
  });
});

describe("FakeLlmProvider (inchangé)", () => {
  it("reste utilisable seul dans la chaîne", async () => {
    const chain = new FallbackLlmProvider([new FakeLlmProvider("salut")]);
    expect((await chain.chat([{ role: "user", content: "x" }])).content).toBe("salut");
  });
});
