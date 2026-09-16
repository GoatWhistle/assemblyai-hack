import { buildKeyterms } from "@/lasa"
import { GREETING, SYSTEM_PROMPT } from "./prompt"
import { type AgentTool, buildTools } from "./tools"

export const DEFAULT_LLM_MODEL = "gemini-2.5-flash"
export const FALLBACK_LLM_MODEL = "gpt-5-mini"

export type TurnDetection = {
  readonly vad_threshold: number
  readonly min_silence: number
  readonly max_silence: number
  readonly interrupt_response: boolean
}

export const TURN_DETECTION: TurnDetection = Object.freeze({
  vad_threshold: 0.6,
  min_silence: 600,
  max_silence: 2200,
  interrupt_response: true,
})

export type AgentDefinition = {
  readonly name: string
  readonly model: string
  readonly system_prompt: string
  readonly greeting: string
  readonly input: {
    readonly format: { readonly encoding: "audio/pcm" }
    readonly keyterms: readonly string[]
    readonly turn_detection: TurnDetection
  }
  readonly output: {
    readonly voice: string
    readonly format: { readonly encoding: "audio/pcm" }
  }
  readonly tools: readonly AgentTool[]
}

export function buildAgentDefinition(input: {
  baseUrl: string
  toolSecret: string
  model?: string
  voice?: string
}): AgentDefinition {
  if (TURN_DETECTION.min_silence >= TURN_DETECTION.max_silence) {
    throw new RangeError("min_silence must stay strictly below max_silence")
  }
  return {
    name: "readback-intake",
    model: input.model ?? DEFAULT_LLM_MODEL,
    system_prompt: SYSTEM_PROMPT,
    greeting: GREETING,
    input: {
      format: { encoding: "audio/pcm" },
      keyterms: buildKeyterms(),
      turn_detection: TURN_DETECTION,
    },
    output: {
      voice: input.voice ?? "anna",
      format: { encoding: "audio/pcm" },
    },
    tools: buildTools(input.baseUrl, input.toolSecret),
  }
}
