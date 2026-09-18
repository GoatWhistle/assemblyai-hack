import { buildKeyterms } from "@/lasa"
import { GREETING, SYSTEM_PROMPT } from "./prompt"
import { type AgentTool, buildTools } from "./tools"

export const DEFAULT_LLM_MODEL = "gemini-2.5-flash"

export type TurnDetection = {
  readonly vad_threshold: number
  readonly interrupt_response: boolean
}

export const TURN_DETECTION: TurnDetection = Object.freeze({
  vad_threshold: 0.6,
  interrupt_response: true,
})

export const ADAPTIVE_PACING_DISABLING_FIELDS = Object.freeze(["min_silence", "max_silence"])

export const ADAPTIVE_PACING_NOTE =
  "the vendor documents that setting min_silence or max_silence turns off adaptive pacing and entity-aware waiting for the rest of the session, and entity-aware waiting is what holds the turn through a phone number, an email or a date. Our worst case is a dictated NPI or DEA number arriving in digit groups, so the feature we would be switching off is the one that protects the field where a truncation costs most: a half-heard identifier fails its checksum on a value nobody mis-said. Source: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/turn-detection-and-interruptions, read 17 September 2026"

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
  for (const field of ADAPTIVE_PACING_DISABLING_FIELDS) {
    if (field in TURN_DETECTION) {
      throw new RangeError(
        `${field} must not reach the stored agent definition: ${ADAPTIVE_PACING_NOTE}`,
      )
    }
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
