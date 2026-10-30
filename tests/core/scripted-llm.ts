import type {
  ChatMessage,
  ChatOptions,
  ChatResult,
  LlmProvider,
  ToolCall,
  TranscribeInput,
  TranscribeResult,
} from "@/providers/llm/types";

export type ScriptStep =
  | { type: "text"; content: string }
  | { type: "tool"; name: string; arguments: Record<string, unknown> };

/**
 * Modèle scripté pour les tests du cœur : rejoue une file de réponses
 * (texte ou appels d'outils) et enregistre ce que le cœur lui a envoyé,
 * pour vérifier les outils exposés et la consigne système.
 */
export class ScriptedLlm implements LlmProvider {
  readonly name = "scripted";
  readonly calls: { messages: ChatMessage[]; options?: ChatOptions }[] = [];
  private seq = 0;

  constructor(private readonly steps: ScriptStep[]) {}

  async chat(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResult> {
    this.calls.push({ messages, options });
    this.seq += 1;
    const step = this.steps.shift();
    if (!step) {
      return { content: "(plus de script)", toolCalls: [], finishReason: "stop", model: "scripted", raw: null };
    }
    if (step.type === "text") {
      return { content: step.content, toolCalls: [], finishReason: "stop", model: "scripted", raw: null };
    }
    const call: ToolCall = {
      id: `call-${this.seq}`,
      name: step.name,
      arguments: JSON.stringify(step.arguments),
    };
    return { content: null, toolCalls: [call], finishReason: "tool_calls", model: "scripted", raw: null };
  }

  async transcribe(_audio: TranscribeInput): Promise<TranscribeResult> {
    void _audio;
    throw new Error("transcribe non scripté");
  }
}
