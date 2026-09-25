import { describe, expect, it } from "vitest"
import { judgeNamedAnswer } from "@/confirmation"
import { ConfirmationReason, FieldName } from "@/domain"
import { contrastiveUtterance } from "@/gate"
import { type ConfirmationSubject, evaluateConfirmation, type TimelineEntry } from "@/sessions"

const MORPHINE: ConfirmationSubject = {
  field: FieldName.DrugName,
  candidateId: "c-morphine",
  rawValue: "Morphine",
  normalizedValue: "morphine",
}

const LISINOPRIL: ConfirmationSubject = {
  field: FieldName.DrugName,
  candidateId: "c-lisinopril",
  rawValue: "lisinopril",
  normalizedValue: "lisinopril",
}

const CONTRASTIVE = contrastiveUtterance("morphine", ["hydromorphone"])
const PLAIN = "Confirming the drug name: morphine. Correct?"

function timeline(readBack: string, reply: string): readonly TimelineEntry[] {
  return [
    {
      seq: 1,
      kind: "agent",
      turn: {
        role: "agent",
        replyId: "r-1",
        text: readBack,
        status: "completed",
        playedMs: 3000,
        durationMs: 3000,
      },
    },
    {
      seq: 2,
      kind: "caller",
      turn: { turnOrder: 2, transcript: reply, isFormatted: true, words: [] },
    },
  ]
}

function judge(
  subject: ConfirmationSubject,
  readBack: string,
  reply: string,
  lasaChecked = true,
) {
  return evaluateConfirmation({
    subject,
    timeline: timeline(readBack, reply),
    callerAnswerHint: "yes",
    lasaChecked,
  })
}

describe("condition 6: a pair-rule value is confirmed only by the caller naming it", () => {
  it("the contrastive read-back names both drugs, each with the letters that tell them apart", () => {
    expect(CONTRASTIVE).toContain("morphine, M-O-R")
    expect(CONTRASTIVE).toContain("hydromorphone, H-Y-D")
  })

  for (const reply of ["yes", "Yes.", "correct", "that's right", "yeah", "right"]) {
    it(`${ConfirmationReason.LasaNamedAnswerRequired}: "${reply}" never confirms a pair-rule value`, () => {
      const evidence = judge(MORPHINE, CONTRASTIVE, reply)
      expect(evidence.verdict).toBe("unclear")
      expect(evidence.reasonCode).toBe(ConfirmationReason.LasaNamedAnswerRequired)
    })
  }

  for (const reply of ["morphine", "Morphine.", "yes, morphine", "the morphine one"]) {
    it(`${ConfirmationReason.CallerNamedValue}: "${reply}" names the value and confirms it`, () => {
      const evidence = judge(MORPHINE, CONTRASTIVE, reply)
      expect(evidence.verdict).toBe("confirmed")
      expect(evidence.reasonCode).toBe(ConfirmationReason.CallerNamedValue)
    })
  }

  for (const reply of [
    "hydromorphone",
    "No, hydromorphone.",
    "morphine, no wait, hydromorphone",
  ]) {
    it(`${ConfirmationReason.CallerNamedPartner}: "${reply}" corrects the value to the partner`, () => {
      const evidence = judge(MORPHINE, CONTRASTIVE, reply)
      expect(evidence.verdict).toBe("rejected")
      expect(evidence.reasonCode).toBe(ConfirmationReason.CallerNamedPartner)
      expect(judgeNamedAnswer({ subject: MORPHINE, text: reply }).correctedTo).toBe(
        "hydromorphone",
      )
    })
  }

  it(`${ConfirmationReason.CallerNamedValue}: "morphine, not hydromorphone" keeps the value`, () => {
    expect(judge(MORPHINE, CONTRASTIVE, "morphine, not hydromorphone").reasonCode).toBe(
      ConfirmationReason.CallerNamedValue,
    )
  })

  it(`${ConfirmationReason.LasaNamedAnswerRequired}: naming both without choosing settles nothing`, () => {
    expect(
      judgeNamedAnswer({ subject: MORPHINE, text: "morphine or hydromorphone" }).reasonCode,
    ).toBe(ConfirmationReason.LasaNamedAnswerRequired)
  })

  it(`${ConfirmationReason.CallerNegated}: a plain no is still a refusal, not a name request`, () => {
    const evidence = judge(MORPHINE, CONTRASTIVE, "no")
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerNegated)
  })

  it(`${ConfirmationReason.ReadBackNotContrastive}: a plain read-back of a pair-rule value cannot confirm it, even when the caller parrots the name`, () => {
    const evidence = judge(MORPHINE, PLAIN, "yes, morphine")
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.ReadBackNotContrastive)
  })
})

describe("the pair rule is one flag, and it only touches values in a published pair", () => {
  it(`${ConfirmationReason.CallerAffirmed}: with the flag off, the shipped plain read-back takes a yes`, () => {
    const evidence = judge(MORPHINE, PLAIN, "yes", false)
    expect(evidence.verdict).toBe("confirmed")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerAffirmed)
  })

  it(`${ConfirmationReason.CallerAffirmed}: with the flag on, a value in no pair still takes a plain yes`, () => {
    const evidence = judge(LISINOPRIL, "Confirming the drug name: lisinopril. Correct?", "yes")
    expect(evidence.verdict).toBe("confirmed")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerAffirmed)
  })

  it("a value confirmed at confidence 1.0 still needed its name: certainty never enters condition 6", () => {
    const evidence = judge(MORPHINE, CONTRASTIVE, "yes")
    expect(evidence.reasonCode).toBe(ConfirmationReason.LasaNamedAnswerRequired)
  })
})
