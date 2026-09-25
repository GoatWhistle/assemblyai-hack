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
import {
  FLUENT_TURN,
  fluentWrongPartnerCandidate,
  UNKNOWN_NAME_HEARD,
  unknownValueCandidate,
} from "./probe-candidates"

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
    spoken: "hydromorphone",
    heard: "morphine",
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

export const ProbeId = {
  UnsupportedValue: "unsupported_value",
  UnknownValue: "unknown_value",
  FluentWrongPartner: "fluent_wrong_partner",
} as const

export type ProbeId = (typeof ProbeId)[keyof typeof ProbeId]

type ProbeText = {
  readonly id: ProbeId
  readonly label: string
  readonly headerNote: string
  readonly spoken: string
  readonly heard: string
  readonly whyThisOne: string
}

export type BrowserProbe = ProbeText & {
  readonly runsOn: "browser"
  readonly candidate: FieldCandidate
  readonly decision: GateDecision
}

export type ServerProbe = ProbeText & {
  readonly runsOn: "server"
}

export type Probe = BrowserProbe | ServerProbe

function inBrowser(text: ProbeText, candidate: FieldCandidate): BrowserProbe {
  return Object.freeze({
    ...text,
    runsOn: "browser" as const,
    candidate,
    decision: decide(candidate, policyFor(candidate.field)),
  })
}

export const PROBES: readonly Probe[] = Object.freeze([
  Object.freeze({
    id: ProbeId.UnsupportedValue,
    runsOn: "server" as const,
    label: "The model proposes a value nobody said",
    headerNote:
      "The agent hands the server a value together with provenance that points at a real turn. The server reconciles the value against the words of that turn, and the gate refuses what the speech does not support.",
    spoken: "shown from the server's evidence once it answers",
    heard: "shown from the server's evidence once it answers",
    whyThisOne:
      "The reconciliation lives on the server, so this button asks the server rather than imitating it here. If the server does not answer, the page says so and shows no verdict.",
  }),
  inBrowser(
    {
      id: ProbeId.UnknownValue,
      label: "A name the catalogue does not hold",
      headerNote:
        "The recognizer was sure of a name that exists nowhere in the built catalogue. The gate asks again and offers nothing in its place.",
      spoken: UNKNOWN_NAME_HEARD.toLowerCase(),
      heard: UNKNOWN_NAME_HEARD.toLowerCase(),
      whyThisOne:
        "Substituting the nearest real name is how a look-alike partner gets written without anyone saying it. The only honest move on a miss is to ask.",
    },
    unknownValueCandidate(),
  ),
  inBrowser(
    {
      id: ProbeId.FluentWrongPartner,
      label: "A fluent answer naming a listed partner of the spoken drug",
      headerNote:
        "Every word of the turn arrived at certainty 1.00 with no pause between words, and the drug it names sits in a published pair. Fluency is not proof, so the gate asks.",
      spoken: "hydralazine",
      heard: FLUENT_TURN,
      whyThisOne:
        "A hesitation detector would have nothing to work with here, and a threshold would pass it. Only the published pair table objects.",
    },
    fluentWrongPartnerCandidate(),
  ),
])

export function probeFor(id: ProbeId): Probe {
  const found = PROBES.find((probe) => probe.id === id)
  if (found === undefined) {
    throw new RangeError(`unknown probe: ${id}`)
  }
  return found
}

export function isProbeId(id: string): id is ProbeId {
  return PROBES.some((probe) => probe.id === id)
}
