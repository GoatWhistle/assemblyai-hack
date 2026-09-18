import { type FieldCandidate, type FieldPolicy, GateAction, type GateDecision } from "@/domain"
import { policyFor } from "@/domain/policy"
import { decide } from "@/gate"
import { LASA_CANDIDATE } from "./scenario"

type DemoArmId = "gated" | "ungated"

export type DemoArm = {
  readonly id: DemoArmId
  readonly title: string
  readonly note: string
  readonly decision: GateDecision
  readonly agentLine: string
  readonly outcomeLabel: string
  readonly outcomeValue: string
  readonly outcomeBody: string
  readonly restingValue: string
  readonly restingNote: string
}

export const SPOKEN_TRUTH = "lisinopril"
export const RECOGNIZED_AS = "bisoprolol"
export const RECOGNIZER_CERTAINTY = LASA_CANDIDATE.provenance.minConfidence

export const SHIPPED_POLICY: FieldPolicy = policyFor(LASA_CANDIDATE.field)

export const THRESHOLD_ONLY_POLICY: FieldPolicy = Object.freeze({
  ...SHIPPED_POLICY,
  lasaChecked: false,
  readBackAlways: false,
})

function acceptedValue(candidate: FieldCandidate): string {
  return `${String(candidate.normalizedValue)} 10 mg`
}

function armsFor(candidate: FieldCandidate): readonly DemoArm[] {
  const gated = decide(candidate, SHIPPED_POLICY)
  const ungated = decide(candidate, THRESHOLD_ONLY_POLICY)
  const written = ungated.action === GateAction.Accept
  const accepted = acceptedValue(candidate)

  return Object.freeze([
    Object.freeze({
      id: "gated" as const,
      title: "Gate on",
      note: "The shipped configuration. A drug name inside a published pair triggers a re-ask regardless of certainty.",
      decision: gated,
      agentLine: gated.agentUtterance,
      outcomeLabel: "What entered the order",
      outcomeValue: "Nothing yet",
      outcomeBody: `The field stays empty and the agent names both alternatives from the ISMP list. There is no code path that writes an unconfirmed value, so the refusal is structural rather than a policy the model chose to follow. Certainty here was ${RECOGNIZER_CERTAINTY.toFixed(2)} and the pair check was still read first.`,
      restingValue: "Nothing will enter",
      restingNote: "The published pair forces a re-ask before any value is written.",
    }),
    Object.freeze({
      id: "ungated" as const,
      title: "Gate off",
      note: "The same candidate through the same decision function with the pair check and the read-back requirement switched off, which is what a confidence threshold alone amounts to.",
      decision: ungated,
      agentLine: ungated.agentUtterance,
      outcomeLabel: "What entered the order",
      outcomeValue: written ? accepted : "Nothing yet",
      outcomeBody: `A beta blocker was ordered where an ACE inhibitor was spoken. Certainty was ${RECOGNIZER_CERTAINTY.toFixed(2)}, the catalogue lookup passed, and every numeric check agreed. This is the failure the product exists to prevent, and no threshold catches it.`,
      restingValue: written ? `${accepted} will enter` : "Nothing will enter",
      restingNote:
        "The wrong medicine, accepted because certainty was high and every check passed.",
    }),
  ])
}

export const DEMO_ARMS: readonly DemoArm[] = armsFor(LASA_CANDIDATE)

export type DemoStage = {
  readonly atMs: number
  readonly label: string
}

export const DECISION_AT_MS = 9600

export const DEMO_STAGES: readonly DemoStage[] = [
  { atMs: 0, label: "Session opens, both sockets carry short-lived tokens" },
  { atMs: 6800, label: "Caller says the drug name" },
  { atMs: 8400, label: "Recognizer finalises the turn at 1.00 certainty" },
  { atMs: 9100, label: "Gate reads the published pair table" },
  { atMs: DECISION_AT_MS, label: "Gate on: re-ask fires. Gate off: value is written" },
  { atMs: 16200, label: "Caller corrects to lisinopril and spells it" },
  { atMs: 18400, label: "Both sockets close after their confirmations" },
]

export const DEMO_DURATION_MS = 18600
