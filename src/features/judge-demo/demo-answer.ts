import { classifyCallerReply, judgeNamedAnswer, type NamedAnswer } from "@/confirmation"
import {
  type ConfirmationReason,
  type ConfirmationVerdict,
  type FieldCandidate,
  type GateDecision,
  ReasonCode,
} from "@/domain"

export type DemoAnswer = {
  readonly callerSaid: string
  readonly verdict: ConfirmationVerdict
  readonly reasonCode: ConfirmationReason
  readonly settledOn: string | null
}

function heardValue(candidate: FieldCandidate): string {
  return String(candidate.normalizedValue ?? candidate.rawValue).toLowerCase()
}

function settledBy(candidate: FieldCandidate, named: NamedAnswer): string | null {
  if (named.verdict === "confirmed") {
    return heardValue(candidate)
  }
  if (named.verdict === "rejected" && named.correctedTo !== null) {
    return named.correctedTo.toLowerCase()
  }
  return null
}

function contrastiveAnswer(candidate: FieldCandidate, callerSaid: string): DemoAnswer {
  const named = judgeNamedAnswer({
    subject: {
      field: candidate.field,
      rawValue: candidate.rawValue,
      normalizedValue: candidate.normalizedValue,
    },
    text: callerSaid,
  })
  return Object.freeze({
    callerSaid,
    verdict: named.verdict,
    reasonCode: named.reasonCode,
    settledOn: settledBy(candidate, named),
  })
}

function plainAnswer(candidate: FieldCandidate, callerSaid: string): DemoAnswer {
  const reply = classifyCallerReply({
    text: callerSaid,
    valueText: [candidate.rawValue, candidate.normalizedValue ?? ""].join(" "),
  })
  return Object.freeze({
    callerSaid,
    verdict: reply.verdict,
    reasonCode: reply.reasonCode,
    settledOn: reply.verdict === "confirmed" ? heardValue(candidate) : null,
  })
}

export function answerTo(
  decision: GateDecision,
  candidate: FieldCandidate,
  callerSaid: string,
): DemoAnswer {
  return decision.reasonCode === ReasonCode.LasaHit
    ? contrastiveAnswer(candidate, callerSaid)
    : plainAnswer(candidate, callerSaid)
}
