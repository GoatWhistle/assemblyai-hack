import { judgeNamedAnswer, partnersOf } from "@/confirmation"
import {
  type ConfirmationReason,
  type ConfirmationVerdict,
  type FieldCandidate,
  FieldName,
  type FieldPolicy,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  PAIR_RULE_FLAG,
  policyFor,
  VerdictOutcome,
  withoutPairRule,
} from "@/domain"
import { decide, namedAnswerRequiredUtterance } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { evaluateConfirmation, type TimelineEntry } from "../confirmation-evidence"

export const DEMO_SPOKEN = "hydromorphone"
export const DEMO_RECOGNIZED = "morphine"
const DEMO_REFLEX_ANSWER = "Yes."
const DEMO_NAMED_ANSWER = "Hydromorphone."

export type DemoArmId = "pair_rule" | "plain_read_back"

export type DemoExchange = {
  readonly agentSays: string
  readonly callerSays: string
  readonly verdict: ConfirmationVerdict
  readonly reasonCode: ConfirmationReason
}

export type DemoOutcome = {
  readonly arm: DemoArmId
  readonly pairRule: boolean
  readonly readBackAlways: boolean
  readonly spokenByHuman: string
  readonly recognizedValue: string
  readonly minConfidence: number
  readonly validatorOutcome: string
  readonly action: string
  readonly reasonCode: string
  readonly agentUtterance: string
  readonly exchanges: readonly DemoExchange[]
  readonly writtenValue: string | null
  readonly writtenToOrder: boolean
  readonly wrongDrugOrdered: boolean
}

function demoCandidate(sessionId: string): FieldCandidate {
  const words = [
    makeWordSpan({ text: "Morphine", startMs: 4120, endMs: 4890, confidence: 1.0 }),
  ]
  return makeCandidate({
    candidateId: `${sessionId}-drug`,
    field: FieldName.DrugName,
    rawValue: "Morphine",
    normalizedValue: DEMO_RECOGNIZED,
    provenance: makeProvenance({
      words,
      turnOrder: 3,
      transcriptSlice: "Morphine",
      sessionId,
      sttTurnIsFormatted: false,
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "morphine resolves to morphine sulfate in the built catalogue",
      checkedValue: DEMO_RECOGNIZED,
      evidence: { resolvedTo: "morphine sulfate", hasCheckDigit: false },
    }),
    lasa: lasaRiskFor(DEMO_RECOGNIZED),
    attempt: 1,
  })
}

function exchange(input: {
  candidate: FieldCandidate
  policy: FieldPolicy
  agentSays: string
  callerSays: string
}): DemoExchange {
  const timeline: TimelineEntry[] = [
    {
      seq: 1,
      kind: "agent",
      turn: {
        role: "agent",
        replyId: "demo-read-back",
        text: input.agentSays,
        status: "completed",
        playedMs: 3000,
        durationMs: 3000,
      },
    },
    {
      seq: 2,
      kind: "caller",
      turn: { turnOrder: 4, transcript: input.callerSays, isFormatted: true, words: [] },
    },
  ]
  const evidence = evaluateConfirmation({
    subject: input.candidate,
    timeline,
    callerAnswerHint: null,
    lasaChecked: input.policy[PAIR_RULE_FLAG],
  })
  return Object.freeze({
    agentSays: input.agentSays,
    callerSays: input.callerSays,
    verdict: evidence.verdict,
    reasonCode: evidence.reasonCode,
  })
}

export const DEMO_ARM_POLICIES: Readonly<Record<DemoArmId, FieldPolicy>> = Object.freeze({
  pair_rule: policyFor(FieldName.DrugName),
  plain_read_back: withoutPairRule(policyFor(FieldName.DrugName)),
})

function settle(candidate: FieldCandidate, exchanges: readonly DemoExchange[]): string | null {
  const last = exchanges.at(-1)
  if (last === undefined || last.verdict === "unclear") {
    return null
  }
  if (last.verdict === "confirmed") {
    return String(candidate.normalizedValue)
  }
  return judgeNamedAnswer({ subject: candidate, text: last.callerSays }).correctedTo
}

function runArm(arm: DemoArmId, candidate: FieldCandidate): DemoOutcome {
  const policy = DEMO_ARM_POLICIES[arm]
  const decision = decide(candidate, policy)
  const first = exchange({
    candidate,
    policy,
    agentSays: decision.agentUtterance,
    callerSays: DEMO_REFLEX_ANSWER,
  })
  const exchanges =
    first.verdict === "unclear"
      ? [
          first,
          exchange({
            candidate,
            policy,
            agentSays: namedAnswerRequiredUtterance(DEMO_RECOGNIZED, partnersOf(candidate)),
            callerSays: DEMO_NAMED_ANSWER,
          }),
        ]
      : [first]
  const writtenValue = settle(candidate, exchanges)
  return Object.freeze({
    arm,
    pairRule: policy[PAIR_RULE_FLAG],
    readBackAlways: policy.readBackAlways,
    spokenByHuman: DEMO_SPOKEN,
    recognizedValue: DEMO_RECOGNIZED,
    minConfidence: candidate.provenance.minConfidence,
    validatorOutcome: candidate.verdict.outcome,
    action: decision.action,
    reasonCode: decision.reasonCode,
    agentUtterance: decision.agentUtterance,
    exchanges: Object.freeze(exchanges),
    writtenValue,
    writtenToOrder: writtenValue !== null,
    wrongDrugOrdered: writtenValue !== null && writtenValue !== DEMO_SPOKEN,
  })
}

export function runDemo(sessionId: string): readonly DemoOutcome[] {
  const candidate = demoCandidate(sessionId)
  return Object.freeze([runArm("pair_rule", candidate), runArm("plain_read_back", candidate)])
}
