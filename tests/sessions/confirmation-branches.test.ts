import { describe, expect, it } from "vitest"
import { classifyCallerReply } from "@/confirmation"
import { ConfirmationReason, FieldName, makeWordSpan } from "@/domain"
import { contrastiveUtterance } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import { type ConfirmationSubject, evaluateConfirmation, type TimelineEntry } from "@/sessions"

const LISINOPRIL: ConfirmationSubject = {
  field: FieldName.DrugName,
  candidateId: "c-drug",
  rawValue: "lisinopril",
  normalizedValue: "lisinopril",
}

const HYDROMORPHONE: ConfirmationSubject = {
  field: FieldName.DrugName,
  candidateId: "c-lasa",
  rawValue: "hydromorphone",
  normalizedValue: "hydromorphone",
}

const LISINOPRIL_READ_BACK = "Confirming the drug name: lisinopril. Correct?"
const HYDROMORPHONE_READ_BACK = contrastiveUtterance("hydromorphone", [
  ...lasaRiskFor("hydromorphone").confusableWith,
])

function agent(seq: number, text: string): TimelineEntry {
  return {
    seq,
    kind: "agent",
    turn: {
      role: "agent",
      replyId: `reply-${seq}`,
      text,
      status: "completed",
      playedMs: 2400,
      durationMs: 2400,
    },
  }
}

function caller(seq: number, text: string): TimelineEntry {
  return {
    seq,
    kind: "caller",
    turn: {
      turnOrder: seq,
      transcript: text,
      isFormatted: true,
      words: text.split(" ").map((word, index) =>
        makeWordSpan({
          text: word,
          startMs: seq * 1000 + index * 200,
          endMs: seq * 1000 + index * 200 + 150,
          confidence: 0.99,
        }),
      ),
    },
  }
}

function judge(subject: ConfirmationSubject, timeline: readonly TimelineEntry[]) {
  return evaluateConfirmation({ subject, timeline, callerAnswerHint: "yes", lasaChecked: true })
}

describe("each way a newer turn burns a yes has its own test", () => {
  it(`${ConfirmationReason.Superseded}: a later turn that is only the LASA partner's name burns the named answer`, () => {
    const evidence = judge(HYDROMORPHONE, [
      agent(1, HYDROMORPHONE_READ_BACK),
      caller(2, "hydromorphone"),
      caller(3, "morphine"),
    ])
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.Superseded)
  })

  it(`${ConfirmationReason.Superseded}: "no, not lisinopril" retracts the value without naming the field`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, LISINOPRIL_READ_BACK),
      caller(2, "yes"),
      caller(3, "no, not lisinopril"),
    ])
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.Superseded)
  })
})

describe("the caller's first answer decides before any later turn is read", () => {
  it(`${ConfirmationReason.CallerNegated}: a no stays the reason even when a correction follows`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, LISINOPRIL_READ_BACK),
      caller(2, "no"),
      caller(3, "actually the drug is bisoprolol"),
    ])
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerNegated)
  })
})

describe("a reply with no words is not a backchannel", () => {
  it(`${ConfirmationReason.CallerUnclear}: punctuation alone is unclear`, () => {
    const reply = classifyCallerReply({ text: "...", valueText: "lisinopril" })
    expect(reply.verdict).toBe("unclear")
    expect(reply.reasonCode).toBe(ConfirmationReason.CallerUnclear)
  })

  it(`${ConfirmationReason.CallerUnclear}: an empty caller turn after a read-back is unclear`, () => {
    const evidence = judge(LISINOPRIL, [agent(1, LISINOPRIL_READ_BACK), caller(2, "...")])
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerUnclear)
  })
})
