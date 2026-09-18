import {
  type FieldCandidate,
  GateAction,
  type GateDecision,
  policyFor,
  type ReasonCode,
} from "@/domain"
import { decide } from "@/gate"
import {
  checksumCandidate,
  cleanOrderCandidate,
  pairHitCandidate,
  patientNameCandidate,
  quietRoomCandidate,
} from "./candidates"

export const ScenarioId = {
  CleanOrder: "clean_order",
  PairHitAtCeiling: "pair_hit_at_ceiling",
  QuietRoom: "quiet_room",
  ChecksumRejected: "checksum_rejected",
  NoValidatorExists: "no_validator_exists",
} as const

export type ScenarioId = (typeof ScenarioId)[keyof typeof ScenarioId]

export type Scenario = {
  readonly id: ScenarioId
  readonly label: string
  readonly headerNote: string
  readonly spoken: string
  readonly heard: string
  readonly candidate: FieldCandidate
  readonly decision: GateDecision
  readonly whyThisOne: string
}

type Draft = Omit<Scenario, "decision">

const DRAFTS: readonly Draft[] = [
  {
    id: ScenarioId.CleanOrder,
    label: "A clean order the gate simply writes",
    headerNote:
      "Every check agrees, the recognizer was certain, and this field carries no standing read-back requirement. The gate writes the value and says nothing further.",
    spoken: "tablet",
    heard: "tablet",
    candidate: cleanOrderCandidate(),
    whyThisOne:
      "Without this button the picker would show only refusals, and a page of refusals reads as an agent that never lets anything through. This is the cost side of the idea made visible.",
  },
  {
    id: ScenarioId.PairHitAtCeiling,
    label: "A published look-alike name at full certainty",
    headerNote:
      "The recognizer reported 1.00 and every check passed. The published pair table is read before the threshold, so the gate asks anyway.",
    spoken: "lisinopril",
    heard: "bisoprolol",
    candidate: pairHitCandidate(),
    whyThisOne:
      "This is the scenario the product exists for. The ask happens at the ceiling of certainty, where raising a threshold could not have produced it.",
  },
  {
    id: ScenarioId.QuietRoom,
    label: "A dosage spoken too quietly to read",
    headerNote:
      "The catalogue lookup passed, and the recognizer's own certainty over these words fell under the threshold this deployment set for the field.",
    spoken: "ten milligrams",
    heard: "ten milligrams",
    candidate: quietRoomCandidate(),
    whyThisOne:
      "The first of the three reasons, and the only one where the ask really is about a weak signal rather than about the value.",
  },
  {
    id: ScenarioId.ChecksumRejected,
    label: "An identifier whose arithmetic does not close",
    headerNote:
      "Nine digits arrived clearly and the Luhn check over them fails. Certainty about the audio does not make the number valid, so the gate moves straight to a spell-out.",
    spoken: "one two three four five six seven eight nine zero",
    heard: "one two three four five six seven eight nine zero",
    candidate: checksumCandidate(),
    whyThisOne:
      "The second of the three reasons, and the field where voice is not spent by default: arithmetic rejects a mistyped digit independently of what was heard.",
  },
  {
    id: ScenarioId.NoValidatorExists,
    label: "A field with nothing to check it against",
    headerNote:
      "A patient name has no checksum and no catalogue. Voice confirmation is the only proof available for it, so the read-back is not a threshold question at all.",
    spoken: "Jane Doe",
    heard: "Jane Doe",
    candidate: patientNameCandidate(),
    whyThisOne:
      "Certainty was high and nothing objected. The read-back happens because no independent check exists to substitute for it.",
  },
]

export const SCENARIOS: readonly Scenario[] = Object.freeze(
  DRAFTS.map((draft) =>
    Object.freeze({
      ...draft,
      decision: decide(draft.candidate, policyFor(draft.candidate.field)),
    }),
  ),
)

export function scenarioFor(id: ScenarioId): Scenario {
  const found = SCENARIOS.find((scenario) => scenario.id === id)
  if (found === undefined) {
    throw new RangeError(`unknown scenario: ${id}`)
  }
  return found
}

export function refusingScenarios(): readonly Scenario[] {
  return SCENARIOS.filter((scenario) => scenario.decision.action !== GateAction.Accept)
}

export function acceptingScenarios(): readonly Scenario[] {
  return SCENARIOS.filter((scenario) => scenario.decision.action === GateAction.Accept)
}

export function reasonCodesShown(): readonly ReasonCode[] {
  return SCENARIOS.map((scenario) => scenario.decision.reasonCode)
}

export const DEFAULT_SCENARIO_ID: ScenarioId = ScenarioId.PairHitAtCeiling
