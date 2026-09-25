import {
  type FieldCandidate,
  type FieldPolicy,
  GateAction,
  type GateDecision,
  policyFor,
  ReasonCode,
} from "@/domain"
import { GateOutcome, outcomeOf } from "@/features/gate-banner/signature"
import {
  type BrowserProbe,
  ProbeId,
  probeFor,
  ScenarioId,
  scenarioFor,
} from "@/features/judge-demo/scenario-picker/scenarios"
import { decide } from "@/gate"

export const GateVerdict = GateOutcome

export type GateVerdict = GateOutcome

export type Moment = {
  readonly id: string
  readonly title: string
  readonly said: string
  readonly heard: string
  readonly certainty: number
  readonly candidate: FieldCandidate
  readonly decision: GateDecision
  readonly verdict: GateVerdict
  readonly withoutGate: GateDecision
  readonly withoutGateWrites: boolean
  readonly withoutGateText: string
  readonly pairOutranksCertainty: boolean
  readonly partners: readonly string[]
}

type Source = {
  readonly id: string
  readonly title: string
  readonly said: string
  readonly heard: string
  readonly candidate: FieldCandidate
}

export function verdictFor(decision: GateDecision): GateVerdict {
  return outcomeOf(decision)
}

export function thresholdOnly(policy: FieldPolicy): FieldPolicy {
  return Object.freeze({ ...policy, lasaChecked: false, readBackAlways: false })
}

function browserProbe(id: ProbeId): BrowserProbe {
  const probe = probeFor(id)
  if (probe.runsOn !== "browser") {
    throw new RangeError(`${id} runs on the server and cannot be decided in this page`)
  }
  return probe
}

function fromScenario(id: ScenarioId, title: string): Source {
  const scenario = scenarioFor(id)
  return {
    id,
    title,
    said: scenario.spoken,
    heard: scenario.heard,
    candidate: scenario.candidate,
  }
}

function fromProbe(id: ProbeId, title: string, heard?: string): Source {
  const probe = browserProbe(id)
  return {
    id,
    title,
    said: probe.spoken,
    heard: heard ?? probe.heard,
    candidate: probe.candidate,
  }
}

const SOURCES: readonly Source[] = [
  fromScenario(ScenarioId.CleanOrder, "A clean dosage form"),
  fromScenario(ScenarioId.PairHitAtCeiling, "A look-alike name at full certainty"),
  fromProbe(
    ProbeId.FluentWrongPartner,
    "A fluent turn naming a listed partner of the spoken drug",
    "hydroxyzine",
  ),
  fromScenario(ScenarioId.QuietRoom, "A dosage spoken too quietly"),
  fromScenario(ScenarioId.ChecksumRejected, "An NPI whose checksum fails"),
  fromProbe(ProbeId.UnknownValue, "A name the catalogue does not hold"),
]

function writtenValue(candidate: FieldCandidate): string {
  return String(candidate.normalizedValue)
}

function momentFrom(source: Source): Moment {
  const policy = policyFor(source.candidate.field)
  const decision = decide(source.candidate, policy)
  const withoutGate = decide(source.candidate, thresholdOnly(policy))
  const writes = withoutGate.action === GateAction.Accept
  return Object.freeze({
    ...source,
    certainty: source.candidate.provenance.minConfidence,
    decision,
    verdict: verdictFor(decision),
    withoutGate,
    withoutGateWrites: writes,
    withoutGateText: writes
      ? `Written: ${writtenValue(source.candidate)}`
      : `Asks as well: ${withoutGate.reasonCode}`,
    pairOutranksCertainty: decision.reasonCode === ReasonCode.LasaHit,
    partners:
      decision.reasonCode === ReasonCode.LasaHit ? source.candidate.lasa.confusableWith : [],
  })
}

export const MOMENTS: readonly Moment[] = Object.freeze(SOURCES.map(momentFrom))

export function formatCertainty(value: number): string {
  return `certainty ${value.toFixed(2)}`
}
