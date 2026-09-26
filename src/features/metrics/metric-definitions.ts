export type BenchmarkInput = "live socket" | "tts" | "text" | "fixture"

export const NO_COMMAND = "no command yet"

export type MetricDefinition = {
  readonly id: string
  readonly name: string
  readonly meaning: string
  readonly command: string
  readonly setDescription: string
  readonly value: string | null
  readonly input: BenchmarkInput
  readonly n: number | null
  readonly measuredOn: string | null
  readonly tone?: "neutral" | "alert"
}

const HELD_OUT_UNSCORED = "the held-out set; no script scores the gate on it yet"

export const GATE_METRICS: readonly MetricDefinition[] = [
  {
    id: "lasa-catch-rate",
    name: "LASA catch rate",
    meaning:
      "Of the held-out items where the recognizer returned the wrong member of a published pair, the share the gate stopped before the value entered the order.",
    command: NO_COMMAND,
    setDescription: HELD_OUT_UNSCORED,
    value: null,
    input: "tts",
    n: null,
    measuredOn: null,
  },
  {
    id: "false-ask-rate",
    name: "False-ask rate",
    meaning:
      "How often the gate asked again when the value was already correct. This is the cost side of the idea and the only honest answer to whether the agent re-asks constantly.",
    command: NO_COMMAND,
    setDescription: HELD_OUT_UNSCORED,
    value: null,
    input: "tts",
    n: null,
    measuredOn: null,
  },
  {
    id: "accepted-wrong",
    name: "Accepted-wrong count",
    meaning:
      "Values the gate let through that were in fact wrong. A single one is a safety failure and raises the threshold for that field.",
    command: NO_COMMAND,
    setDescription: HELD_OUT_UNSCORED,
    value: null,
    input: "tts",
    n: null,
    measuredOn: null,
  },
  {
    id: "read-back-match-rate",
    name: "Read-back match rate",
    meaning: "Share of requested read-backs the caller confirmed on the first attempt.",
    command: NO_COMMAND,
    setDescription: "live sessions with a caller; none has been recorded",
    value: null,
    input: "live socket",
    n: null,
    measuredOn: null,
  },
  {
    id: "escalation-rate",
    name: "Escalation rate",
    meaning:
      "Share of sessions where a critical field exhausted its attempts, so the order was refused and marked as needing a pharmacist.",
    command: NO_COMMAND,
    setDescription: "live sessions with a caller; none has been recorded",
    value: null,
    input: "live socket",
    n: null,
    measuredOn: null,
  },
]

export const LATENCY_METRICS: readonly MetricDefinition[] = [
  {
    id: "word-to-gate",
    name: "Word to gate decision",
    meaning:
      "Milliseconds from the last word of the source span to the gate decision being rendered. This is a browser measurement: word-level timings never reach our server, so it is labelled as client-side and not as a server figure.",
    command: "make measure",
    setDescription: "each live run, spaced about 24 seconds apart",
    value: null,
    input: "live socket",
    n: null,
    measuredOn: null,
  },
  {
    id: "time-to-first-audio",
    name: "Time to first audio",
    meaning:
      "Server-reported milliseconds before the agent's first audio frame, read from GET /v1/sessions/{id}. This one is honest turn-level data from AssemblyAI rather than a browser stopwatch.",
    command: "make measure",
    setDescription: "each live run, spaced about 24 seconds apart",
    value: null,
    input: "live socket",
    n: null,
    measuredOn: null,
  },
]

export const ORDER_METRICS: readonly MetricDefinition[] = [
  {
    id: "words-resaid-per-order",
    name: "Words re-said per order",
    meaning:
      "How many words the caller had to say a second time, per finished order, because the gate asked again. The cost of the idea in the caller's own breath.",
    command: NO_COMMAND,
    setDescription: "finished live orders; none has been recorded",
    value: null,
    input: "live socket",
    n: null,
    measuredOn: null,
  },
]

export type CloseCodeTally = {
  readonly code: number
  readonly label: string
  readonly meaning: string
  readonly count: number
  readonly alertWorthy: boolean
  readonly source: string
}
