import type { TurnRecord } from "@/confirmation"
import {
  classifyCallerReply,
  judgeNamedAnswer,
  matchesServerRecordedAgentLine,
  pairRuleApplies,
  readBackIsContrastive,
  supersedesField,
  valueSpokenIn,
} from "@/confirmation"
import {
  type AgentTurn,
  type CallerTurnEvidence,
  type ConfirmationEvidence,
  ConfirmationReason,
  type ConfirmationVerdict,
  type FieldName,
  READ_BACK_PLAYED_TOLERANCE_MS,
  type ReadBackTurnEvidence,
} from "@/domain"

export type TimelineEntry =
  | { readonly seq: number; readonly kind: "agent"; readonly turn: AgentTurn }
  | { readonly seq: number; readonly kind: "caller"; readonly turn: TurnRecord }

type CallerEntry = Extract<TimelineEntry, { kind: "caller" }>

type AgentEntry = Extract<TimelineEntry, { kind: "agent" }>

export type ConfirmationSubject = {
  readonly field: FieldName
  readonly candidateId: string
  readonly rawValue: string
  readonly normalizedValue: string | number | null
}

function readBackCarriesValue(subject: ConfirmationSubject, text: string): boolean {
  return valueSpokenIn(subject, text)
}

function readBackPlayedInFull(turn: AgentTurn): boolean {
  return (
    turn.status === "completed" &&
    turn.playedMs >= turn.durationMs - READ_BACK_PLAYED_TOLERANCE_MS
  )
}

function readBackEvidence(entry: AgentEntry): ReadBackTurnEvidence {
  return Object.freeze({
    replyId: entry.turn.replyId,
    text: entry.turn.text,
    completed: readBackPlayedInFull(entry.turn),
    playedMs: entry.turn.playedMs,
    durationMs: entry.turn.durationMs,
  })
}

function callerEvidence(entry: CallerEntry): CallerTurnEvidence {
  return Object.freeze({
    turnOrder: entry.turn.turnOrder,
    transcript: entry.turn.transcript,
    words: entry.turn.words,
  })
}

function callerText(turn: TurnRecord): string {
  const fromWords = turn.words.map((word) => word.text).join(" ")
  return fromWords.trim().length > 0 ? fromWords : turn.transcript
}

function evidence(input: {
  subject: ConfirmationSubject
  readBack: AgentEntry | null
  caller: CallerEntry | null
  verdict: ConfirmationVerdict
  reasonCode: ConfirmationReason
  hint: string | null
}): ConfirmationEvidence {
  return Object.freeze({
    field: input.subject.field,
    candidateId: input.subject.candidateId,
    readBack: input.readBack === null ? null : readBackEvidence(input.readBack),
    callerTurn: input.caller === null ? null : callerEvidence(input.caller),
    verdict: input.verdict,
    reasonCode: input.reasonCode,
    callerAnswerHint: input.hint,
  })
}

export function evaluateConfirmation(input: {
  subject: ConfirmationSubject
  timeline: readonly TimelineEntry[]
  callerAnswerHint: string | null
  lasaChecked: boolean
}): ConfirmationEvidence {
  const { subject, timeline } = input
  const pairRule = pairRuleApplies(subject, input.lasaChecked)
  const hint = input.callerAnswerHint
  const readBack =
    [...timeline]
      .reverse()
      .find(
        (entry): entry is AgentEntry =>
          entry.kind === "agent" && readBackCarriesValue(subject, entry.turn.text),
      ) ?? null

  const base = { subject, hint }
  if (readBack === null) {
    return evidence({
      ...base,
      readBack: null,
      caller: null,
      verdict: "unclear",
      reasonCode: ConfirmationReason.NoReadBackTurn,
    })
  }

  const unclear = (caller: CallerEntry | null, reasonCode: ConfirmationReason) =>
    evidence({ ...base, readBack, caller, verdict: "unclear", reasonCode })

  if (pairRule && !readBackIsContrastive(subject, readBack.turn.text)) {
    return unclear(null, ConfirmationReason.ReadBackNotContrastive)
  }
  if (!readBackPlayedInFull(readBack.turn)) {
    return unclear(null, ConfirmationReason.ReadBackInterrupted)
  }

  const callers = timeline.filter(
    (entry): entry is CallerEntry => entry.kind === "caller" && entry.seq > readBack.seq,
  )
  const answer = callers[0] ?? null
  if (answer === null) {
    return unclear(null, ConfirmationReason.NoCallerAnswer)
  }

  const answerText = callerText(answer.turn)
  const echo = matchesServerRecordedAgentLine({
    transcript: answerText,
    agentLine: readBack.turn.text,
  })
  if (echo.matchesAgent) {
    return unclear(answer, ConfirmationReason.EchoTurn)
  }

  const valueText = [subject.rawValue, subject.normalizedValue ?? ""].join(" ")
  const reply = pairRule
    ? judgeNamedAnswer({ subject, text: answerText })
    : classifyCallerReply({ text: answerText, valueText })
  if (reply.verdict !== "confirmed") {
    return evidence({
      ...base,
      readBack,
      caller: answer,
      verdict: reply.verdict,
      reasonCode: reply.reasonCode,
    })
  }

  const superseded = callers.slice(1).some((entry) =>
    supersedesField({
      text: callerText(entry.turn),
      field: subject.field,
      rawValue: subject.rawValue,
    }),
  )
  if (superseded) {
    return evidence({
      ...base,
      readBack,
      caller: answer,
      verdict: "rejected",
      reasonCode: ConfirmationReason.Superseded,
    })
  }

  return evidence({
    ...base,
    readBack,
    caller: answer,
    verdict: reply.verdict,
    reasonCode: reply.reasonCode,
  })
}

export function supersededBy(input: {
  subject: ConfirmationSubject
  turn: TurnRecord
}): boolean {
  return supersedesField({
    text: callerText(input.turn),
    field: input.subject.field,
    rawValue: input.subject.rawValue,
  })
}
