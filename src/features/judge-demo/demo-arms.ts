import {
  type ConfirmationEvidence,
  ConfirmationMode,
  type ConfirmedValue,
  type FieldCandidate,
  type FieldPolicy,
  type GateDecision,
  policyFor,
  withoutPairRule,
} from "@/domain"
import { confirm, decide } from "@/gate"
import { answerTo, type DemoAnswer } from "./demo-answer"
import { DECISION_AT_MS, REPLAY_FROM_MS } from "./replay-clock"
import {
  LASA_CANDIDATE,
  NAMED_ANSWER_AT_MS,
  NAMED_CANDIDATE,
  STRENGTH_CANDIDATE,
} from "./scenario"

export { DECISION_AT_MS, DEMO_DURATION_MS, REPLAY_FROM_MS } from "./replay-clock"

type DemoArmId = "pair-rule" | "plain-read-back"

export type DemoPhase = "resting" | "asked" | "settled"

export type DemoArm = {
  readonly id: DemoArmId
  readonly title: string
  readonly note: string
  readonly policy: FieldPolicy
  readonly decision: GateDecision
  readonly agentLine: string
  readonly answer: DemoAnswer
  readonly written: ConfirmedValue | null
  readonly outcomeLabel: string
  readonly value: Readonly<Record<DemoPhase, string>>
  readonly body: Readonly<Record<DemoPhase, string>>
}

export const SPOKEN_TRUTH = "hydromorphone"
export const RECOGNIZED_AS = "morphine"
export const RECOGNIZER_CERTAINTY = LASA_CANDIDATE.provenance.minConfidence

export const SHIPPED_POLICY: FieldPolicy = policyFor(LASA_CANDIDATE.field)
export const WITHOUT_PAIR_RULE_POLICY: FieldPolicy = withoutPairRule(SHIPPED_POLICY)

export const NAMED_ANSWER = "Hydromorphone."
export const PLAIN_ANSWER = "Yes."

export const SETTLED_AT_MS = NAMED_ANSWER_AT_MS + 1200

const ANSWERABLE: readonly FieldCandidate[] = [LASA_CANDIDATE, NAMED_CANDIDATE]

function writtenFor(answer: DemoAnswer, policy: FieldPolicy): ConfirmedValue | null {
  const candidate = ANSWERABLE.find((entry) => entry.normalizedValue === answer.settledOn)
  if (answer.settledOn === null || candidate === undefined) {
    return null
  }
  return confirm({
    candidate,
    policy,
    decision: decide(candidate, policy),
    confirmationMode: ConfirmationMode.ReadBack,
    callerConfirmed: true,
    confirmedAt: "2026-09-15T09:00:17.400Z",
  })
}

function strengthPart(key: "strength" | "dosageForm" | "route"): string {
  return String(STRENGTH_CANDIDATE.verdict.evidence[key] ?? "").toLowerCase()
}

export function productLine(drug: string): string {
  return `${drug} ${strengthPart("strength").replace("ml", "mL")} ${strengthPart("dosageForm")}, ${strengthPart("route")}`
}

function orderedAs(written: ConfirmedValue | null): string {
  return written === null ? "Nothing written" : productLine(String(written.value))
}

const certainty = RECOGNIZER_CERTAINTY.toFixed(2)

function pairRuleArm(): DemoArm {
  const decision = decide(LASA_CANDIDATE, SHIPPED_POLICY)
  const answer = answerTo(decision, LASA_CANDIDATE, NAMED_ANSWER)
  const reflex = answerTo(decision, LASA_CANDIDATE, PLAIN_ANSWER)
  const written = writtenFor(answer, SHIPPED_POLICY)
  return Object.freeze({
    id: "pair-rule" as const,
    title: "Pair rule on",
    note: "The shipped policy. The drug name sits in a published pair, so the read-back names both drugs and only a spoken name answers it. A yes does not.",
    policy: SHIPPED_POLICY,
    decision,
    agentLine: decision.agentUtterance,
    answer,
    written,
    outcomeLabel: "What entered the order",
    value: {
      resting: "Nothing until a name is said",
      asked: "Nothing yet",
      settled: orderedAs(written),
    },
    body: {
      resting: "The agent will ask which of the two drugs was meant, and wait for a name.",
      asked: `Waiting for the caller to say one of the two names. A plain yes here is answered with ${reflex.reasonCode} and writes nothing.`,
      settled: `The caller said ${SPOKEN_TRUTH}, which corrected the recognizer, and that is what was ordered. Certainty was ${certainty} the whole time; the question, not the number, caught it. Had the caller said yes by reflex, nothing would have been written: ${reflex.reasonCode}.`,
    },
  })
}

function plainReadBackArm(): DemoArm {
  const decision = decide(LASA_CANDIDATE, WITHOUT_PAIR_RULE_POLICY)
  const answer = answerTo(decision, LASA_CANDIDATE, PLAIN_ANSWER)
  const written = writtenFor(answer, WITHOUT_PAIR_RULE_POLICY)
  return Object.freeze({
    id: "plain-read-back" as const,
    title: "Pair rule off",
    note: "The same policy with one flag changed: the pair check is off. The drug name is still read back, because the shipped policy reads back every drug name, and a yes confirms it.",
    policy: WITHOUT_PAIR_RULE_POLICY,
    decision,
    agentLine: decision.agentUtterance,
    answer,
    written,
    outcomeLabel: "What entered the order",
    value: {
      resting: `${orderedAs(written)} will enter after a yes`,
      asked: "Nothing yet",
      settled: orderedAs(written),
    },
    body: {
      resting: "The agent will read the heard name back and accept a yes.",
      asked: "Waiting for a yes or a no to the read-back.",
      settled: `${RECOGNIZED_AS[0]?.toUpperCase()}${RECOGNIZED_AS.slice(1)} was ordered where ${SPOKEN_TRUTH} was spoken. The read-back happened and the caller said yes: a caller who expects to hear a name can confirm the one read to them. Certainty was ${certainty}, the catalogue lookup passed, and no threshold catches it.`,
    },
  })
}

export const DEMO_ARMS: readonly DemoArm[] = Object.freeze([pairRuleArm(), plainReadBackArm()])

const SHIPPED_ARM = DEMO_ARMS[0]

export const SHIPPED_EVIDENCE: ConfirmationEvidence | null =
  SHIPPED_ARM === undefined
    ? null
    : Object.freeze({
        field: LASA_CANDIDATE.field,
        candidateId: LASA_CANDIDATE.candidateId,
        readBack: {
          replyId: "reply-reask",
          text: SHIPPED_ARM.agentLine,
          completed: true,
          playedMs: NAMED_ANSWER_AT_MS - 400 - DECISION_AT_MS,
          durationMs: NAMED_ANSWER_AT_MS - 400 - DECISION_AT_MS,
        },
        callerTurn: {
          turnOrder: NAMED_CANDIDATE.provenance.turnOrder,
          transcript: SHIPPED_ARM.answer.callerSaid,
          words: NAMED_CANDIDATE.provenance.words,
        },
        verdict: SHIPPED_ARM.answer.verdict,
        reasonCode: SHIPPED_ARM.answer.reasonCode,
        callerAnswerHint: null,
      })

export function phaseAt(elapsedMs: number): DemoPhase {
  if (elapsedMs < DECISION_AT_MS) {
    return "resting"
  }
  return elapsedMs < SETTLED_AT_MS ? "asked" : "settled"
}

export type DemoStage = {
  readonly atMs: number
  readonly label: string
}

export const DEMO_STAGES: readonly DemoStage[] = [
  {
    atMs: REPLAY_FROM_MS,
    label: "Session open on short-lived tokens, patient already named; the drug comes next",
  },
  { atMs: 6800, label: "Caller says the drug name" },
  { atMs: 8400, label: "Recognizer finalises the turn at 1.00 certainty" },
  { atMs: 9100, label: "Gate reads the published pair table" },
  {
    atMs: DECISION_AT_MS,
    label: "Pair rule on: asks which of the two. Pair rule off: reads morphine back",
  },
  {
    atMs: NAMED_ANSWER_AT_MS,
    label: "Caller answers: names hydromorphone with the pair rule, says yes without it",
  },
  {
    atMs: SETTLED_AT_MS,
    label: "Pair rule on: hydromorphone written. Pair rule off: morphine written",
  },
]
