import { AGENT_PACING_DISABLING_PARAMS } from "@/domain"
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

export const ADAPTIVE_PACING_DISABLING_FIELDS = AGENT_PACING_DISABLING_PARAMS

export const ADAPTIVE_PACING_NOTE =
  "the vendor documents that setting min_silence or max_silence turns off adaptive pacing and entity-aware waiting for the rest of the session, and entity-aware waiting is what holds the turn through a phone number, an email or a date. Our worst case is a dictated NPI or DEA number arriving in digit groups, so the feature we would be switching off is the one that protects the field where a truncation costs most: a half-heard identifier fails its checksum on a value nobody mis-said. Source: https://www.assemblyai.com/docs/voice-agents/voice-agent-api/turn-detection-and-interruptions, read 17 September 2026"

export const DEFAULT_VOICE_ID = "anna"

export const AGENT_INPUT_NOTE =
  "the Voice Agent session-configuration page documents input.voice_focus (near-field default, far-field; set at connect only) and input.transcription_mode (balanced default, min_latency, max_accuracy), but the create-agent request schema lists only format, turn_detection and keyterms under input, and a stored agent excludes inline session fields. Neither is sent: near-field is already the default and the one we would choose for a handset, and transcription_mode stays at the vendor default until a paid run compares it. transcription_prompt is never sent, because a prompt naming drugs biases the recognizer toward the very names the LASA rule checks. Read 25 September 2026 at https://www.assemblyai.com/docs/voice-agents/voice-agent-api/session-configuration and .../api-spec/create-agent"

export const AGENT_INPUT_UNSENT_FIELDS = Object.freeze([
  "voice_focus",
  "voice_focus_threshold",
  "transcription_mode",
  "transcription_prompt",
  "agent_context",
])

export type AgentDefinition = {
  readonly name: string
  readonly model: string
  readonly voice: { readonly voice_id: string }
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

export const AGENT_NAME_PREFIX = "readback-intake"

export function buildAgentDefinition(input: {
  baseUrl: string
  toolSecret: string
  sessionId?: string
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
    name:
      input.sessionId === undefined
        ? AGENT_NAME_PREFIX
        : `${AGENT_NAME_PREFIX}-${input.sessionId}`,
    model: input.model ?? DEFAULT_LLM_MODEL,
    voice: { voice_id: input.voice ?? DEFAULT_VOICE_ID },
    system_prompt: SYSTEM_PROMPT,
    greeting: GREETING,
    input: {
      format: { encoding: "audio/pcm" },
      keyterms: buildKeyterms(),
      turn_detection: TURN_DETECTION,
    },
    output: {
      voice: input.voice ?? DEFAULT_VOICE_ID,
      format: { encoding: "audio/pcm" },
    },
    tools: buildTools(input.baseUrl, input.toolSecret, input.sessionId),
  }
}
