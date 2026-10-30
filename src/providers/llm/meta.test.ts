import { describe, expect, it, vi } from "vitest";
import { MetaLlmProvider } from "./meta";
import { LlmProviderError } from "./types";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeWav(): Uint8Array {
  const bytes = new Uint8Array(44);
  bytes.set([0x52, 0x49, 0x46, 0x46], 0); // RIFF
  bytes.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  return bytes;
}

describe("MetaLlmProvider.chat", () => {
  it("envoie le format Chat Completions et lit le texte", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        model: "muse-spark-1.3",
        choices: [
          {
            finish_reason: "stop",
            message: { role: "assistant", content: "Bonjour Lomé" },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 3, total_tokens: 13 },
      }),
    );
    const provider = new MetaLlmProvider({ apiKey: "test-key", fetchFn: fetchFn as typeof fetch });
    const result = await provider.chat([{ role: "user", content: "Bonjour" }]);
    expect(result.content).toBe("Bonjour Lomé");
    expect(result.usage?.totalTokens).toBe(13);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.meta.ai/v1/chat/completions");
    const sent = JSON.parse(String(init.body));
    expect(sent.model).toBe("muse-spark-1.3");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-key");
  });

  it("imbrique les outils sous function et lit tool_calls", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        model: "muse-spark-1.3",
        choices: [
          {
            finish_reason: "tool_calls",
            message: {
              role: "assistant",
              content: null,
              tool_calls: [
                {
                  id: "call_1",
                  type: "function",
                  function: { name: "prix_plat", arguments: '{"plat":"alloco"}' },
                },
              ],
            },
          },
        ],
      }),
    );
    const provider = new MetaLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.chat([{ role: "user", content: "Prix ?" }], {
      tools: [
        {
          name: "prix_plat",
          description: "Prix d'un plat",
          parameters: { type: "object", properties: { plat: { type: "string" } } },
        },
      ],
    });
    expect(result.toolCalls).toEqual([
      { id: "call_1", name: "prix_plat", arguments: '{"plat":"alloco"}' },
    ]);
    const sent = JSON.parse(String((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.tools[0]).toMatchObject({ type: "function", function: { name: "prix_plat" } });
  });

  it("envoie response_format json_schema pour la sortie structurée", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        model: "muse-spark-1.3",
        choices: [
          { finish_reason: "stop", message: { content: '{"plat":"alloco","prixFcfa":1000}' } },
        ],
      }),
    );
    const provider = new MetaLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.chat([{ role: "user", content: "Extrais" }], {
      responseFormat: {
        type: "json_schema",
        name: "Plat",
        schema: { type: "object", properties: { plat: { type: "string" } } },
      },
    });
    expect(JSON.parse(result.content ?? "{}")).toEqual({ plat: "alloco", prixFcfa: 1000 });
    const sent = JSON.parse(String((fetchFn.mock.calls[0] as unknown as [string, RequestInit])[1].body));
    expect(sent.response_format.type).toBe("json_schema");
    expect(sent.response_format.json_schema.name).toBe("Plat");
  });

  it("refuse un tool_choice forcé (seul auto est accepté par l'API réelle)", async () => {
    const provider = new MetaLlmProvider({
      apiKey: "k",
      fetchFn: vi.fn() as unknown as typeof fetch,
    });
    await expect(
      provider.chat([{ role: "user", content: "x" }], { toolChoice: { name: "prix_plat" } }),
    ).rejects.toMatchObject({ code: "TOOL_CHOICE_UNSUPPORTED" });
  });

  it("refuse sans clé et remonte les erreurs HTTP", async () => {
    const noKey = new MetaLlmProvider({ apiKey: "", fetchFn: vi.fn() as unknown as typeof fetch });
    await expect(noKey.chat([{ role: "user", content: "x" }])).rejects.toMatchObject({
      code: "MISSING_API_KEY",
    });
    const failing = new MetaLlmProvider({
      apiKey: "k",
      fetchFn: vi.fn(async () =>
        jsonResponse({ error: { message: "invalid key", code: "invalid_api_key" } }, 401),
      ) as typeof fetch,
    });
    const err = await failing.chat([{ role: "user", content: "x" }]).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(LlmProviderError);
    expect((err as LlmProviderError).status).toBe(401);
  });
});

describe("MetaLlmProvider.transcribe", () => {
  it("refuse un fichier non WAV sans appeler l'API", async () => {
    const fetchFn = vi.fn();
    const provider = new MetaLlmProvider({ apiKey: "k", fetchFn: fetchFn as unknown as typeof fetch });
    await expect(
      provider.transcribe({ data: new Uint8Array([1, 2, 3]), filename: "voix.m4a" }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_AUDIO_FORMAT" });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it("envoie un WAV en multipart et lit transcript/turns", async () => {
    const fetchFn = vi.fn(async () =>
      jsonResponse({
        sessionId: "s1",
        transcript: "Bonjour",
        audioDurationMs: 1200,
        turns: [{ turnId: 1, startMs: 0, endMs: 1200, transcript: "Bonjour" }],
      }),
    );
    const provider = new MetaLlmProvider({ apiKey: "k", fetchFn: fetchFn as typeof fetch });
    const result = await provider.transcribe({ data: fakeWav(), filename: "voix.wav" });
    expect(result.text).toBe("Bonjour");
    expect(result.turns).toHaveLength(1);
    expect((fetchFn.mock.calls[0] as unknown as [string])[0]).toBe(
      "https://api.meta.ai/v1/asr/transcribe",
    );
  });
});
