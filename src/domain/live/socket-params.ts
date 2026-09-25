import { ReadbackError } from "../errors"

export const STT_MODEL = "universal-3-5-pro"

export type SocketName = "stt" | "agent"

export const STT_QUERY_PARAMS: readonly string[] = Object.freeze([
  "token",
  "speech_model",
  "encoding",
  "sample_rate",
  "language_codes",
  "language_detection",
  "mode",
  "domain",
  "min_turn_silence",
  "max_turn_silence",
  "end_of_turn_confidence_threshold",
  "vad_threshold",
  "interruption_delay",
  "continuous_partials",
  "include_partial_turns",
  "format_turns",
  "speaker_labels",
  "max_speakers",
  "voice_focus",
  "voice_focus_threshold",
  "redact_pii",
  "redact_pii_policies",
  "redact_pii_sub",
  "filter_profanity",
  "prompt",
  "keyterms_prompt",
  "agent_context",
  "previous_context_n_turns",
  "session_heartbeat",
  "llm_gateway",
  "inactivity_timeout",
])

export const STT_UPDATE_PARAMS: readonly string[] = Object.freeze([
  "type",
  "min_turn_silence",
  "max_turn_silence",
  "end_of_turn_confidence_threshold",
  "vad_threshold",
  "keyterms_prompt",
  "prompt",
])

export const AGENT_INPUT_PARAMS: readonly string[] = Object.freeze([
  "format",
  "keyterms",
  "transcription_mode",
  "transcription_prompt",
  "language_codes",
  "voice_focus",
  "voice_focus_threshold",
  "turn_detection",
])

export const AGENT_TURN_DETECTION_PARAMS: readonly string[] = Object.freeze([
  "vad_threshold",
  "min_silence",
  "max_silence",
  "interrupt_response",
  "interruption_delay",
])

export const AGENT_PACING_DISABLING_PARAMS: readonly string[] = Object.freeze([
  "min_silence",
  "max_silence",
])

const PACING_REFUSAL =
  "the vendor documents that either one turns off adaptive pacing and entity-aware waiting for the rest of the session, which is what holds a turn through a dictated NPI or DEA number"

const COUNTERPARTS: Readonly<Record<string, string>> = Object.freeze({
  min_silence: "min_turn_silence",
  max_silence: "max_turn_silence",
  min_turn_silence: "min_silence",
  max_turn_silence: "max_silence",
})

export class SocketParamError extends ReadbackError {
  readonly socket: SocketName
  readonly offending: readonly string[]

  constructor(
    socket: SocketName,
    offending: readonly string[],
    refusal: "undocumented" | "disables_pacing" = "undocumented",
  ) {
    const described = offending.map((key) => {
      const counterpart = COUNTERPARTS[key.replace(/^turn_detection\./, "")]
      return counterpart === undefined ? key : `${key} (this socket calls it ${counterpart})`
    })
    super(
      refusal === "undocumented" ? "E_UNDOCUMENTED_SOCKET_PARAM" : "E_PACING_DISABLING_PARAM",
      refusal === "undocumented"
        ? `the ${socket === "stt" ? "streaming" : "agent"} socket does not document ${described.join(", ")}; it was refused before the socket opened, because the vendor answers an unknown configuration parameter with a close code mid-session rather than a readable error`
        : `${offending.join(", ")} refused on the agent socket: ${PACING_REFUSAL}`,
    )
    this.socket = socket
    this.offending = Object.freeze([...offending])
  }
}

export const AGENT_SESSION_PARAMS: readonly string[] = Object.freeze([
  "agent_id",
  "system_prompt",
  "greeting",
  "tools",
  "input",
  "output",
])

export type SocketParamScope =
  | "stt_query"
  | "stt_update"
  | "agent_session"
  | "agent_input"
  | "agent_turn_detection"

const SCOPES: Readonly<Record<SocketParamScope, readonly string[]>> = Object.freeze({
  stt_query: STT_QUERY_PARAMS,
  stt_update: STT_UPDATE_PARAMS,
  agent_session: AGENT_SESSION_PARAMS,
  agent_input: AGENT_INPUT_PARAMS,
  agent_turn_detection: AGENT_TURN_DETECTION_PARAMS,
})

function outside(keys: Iterable<string>, allowed: readonly string[], prefix = ""): string[] {
  return [...keys].filter((key) => !allowed.includes(key)).map((key) => `${prefix}${key}`)
}

export function unknownSocketParams(
  socket: SocketParamScope,
  keys: readonly string[],
): readonly string[] {
  return outside(keys, SCOPES[socket])
}

export function undocumentedSttParams(
  params: Readonly<Record<string, unknown>>,
  kind: "connect" | "update" = "connect",
): readonly string[] {
  return outside(Object.keys(params), kind === "connect" ? STT_QUERY_PARAMS : STT_UPDATE_PARAMS)
}

export function undocumentedAgentInput(
  input: Readonly<Record<string, unknown>>,
): readonly string[] {
  const offending = outside(Object.keys(input), AGENT_INPUT_PARAMS)
  const detection = input.turn_detection
  if (typeof detection === "object" && detection !== null) {
    offending.push(
      ...outside(Object.keys(detection), AGENT_TURN_DETECTION_PARAMS, "turn_detection."),
    )
  }
  return offending
}

export function pacingDisablingAgentInput(
  input: Readonly<Record<string, unknown>>,
): readonly string[] {
  const detection = input.turn_detection
  if (typeof detection !== "object" || detection === null) {
    return []
  }
  return Object.keys(detection)
    .filter((key) => AGENT_PACING_DISABLING_PARAMS.includes(key))
    .map((key) => `turn_detection.${key}`)
}
