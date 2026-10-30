import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  LlmProvider,
  TranscribeInput,
  TranscribeResult,
} from "./types";

/** Fournisseur factice déterministe, pour les tests et le développement sans clé. */
export class FakeLlmProvider implements LlmProvider {
  readonly name = "fake";
  readonly calls: { messages: ChatMessage[]; options?: ChatOptions }[] = [];

  constructor(
    private readonly reply: string = "Réponse factice.",
    private readonly transcript: string = "Transcription factice.",
  ) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    this.calls.push({ messages, options });
    // Si un outil est proposé et que le dernier message le suggère, on l'appelle.
    const tool = options?.tools?.[0];
    const last = messages[messages.length - 1];
    const lastText = typeof last?.content === "string" ? last.content : "";
    if (tool && lastText.includes("[outil]")) {
      return {
        content: null,
        toolCalls: [
          { id: "call_fake_1", name: tool.name, arguments: '{"plat":"attiéké poulet"}' },
        ],
        finishReason: "tool_calls",
        model: "fake",
        raw: null,
      };
    }
    return {
      content: this.reply,
      toolCalls: [],
      finishReason: "stop",
      model: "fake",
      raw: null,
    };
  }

  async transcribe(_audio: TranscribeInput): Promise<TranscribeResult> {
    void _audio;
    return { text: this.transcript, turns: [], model: "fake", raw: null };
  }
}
