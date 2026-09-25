import { describe, expect, it } from "vitest"
import type { TurnRecord } from "@/confirmation"
import { type AgentTurn, ConfirmationReason, FieldName, makeWordSpan } from "@/domain"
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

const TEN_MG: ConfirmationSubject = {
  field: FieldName.Strength,
  candidateId: "c-strength",
  rawValue: "10 mg",
  normalizedValue: "10 mg",
}

function agent(seq: number, text: string, overrides: Partial<AgentTurn> = {}): TimelineEntry {
  return {
    seq,
    kind: "agent",
    turn: {
      role: "agent",
      replyId: `reply-${seq}`,
      text,
      status: overrides.status ?? "completed",
      playedMs: overrides.playedMs ?? 2400,
      durationMs: overrides.durationMs ?? 2400,
    },
  }
}

function caller(seq: number, text: string): TimelineEntry {
  const turn: TurnRecord = {
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
  }
  return { seq, kind: "caller", turn }
}

const DRUG_READ_BACK = "Confirming the drug name: lisinopril. Correct?"
const STRENGTH_READ_BACK = "Confirming the strength: 10 mg. Correct?"

function judge(
  subject: ConfirmationSubject,
  timeline: readonly TimelineEntry[],
  lasaChecked = true,
) {
  return evaluateConfirmation({ subject, timeline, callerAnswerHint: "yes", lasaChecked })
}

function answered(subject: ConfirmationSubject, readBack: string, reply: string) {
  return judge(subject, [agent(1, readBack), caller(2, reply)])
}

describe("the seven phrases that used to pass for a yes never yield confirmed", () => {
  const cases: readonly (readonly [string, ConfirmationSubject, string, ConfirmationReason])[] =
    [
      ["yeah, no", LISINOPRIL, DRUG_READ_BACK, ConfirmationReason.CallerNegated],
      [
        "yes but the dose is wrong",
        LISINOPRIL,
        DRUG_READ_BACK,
        ConfirmationReason.CallerCorrected,
      ],
      ["right, no, twenty", TEN_MG, STRENGTH_READ_BACK, ConfirmationReason.CallerNegated],
      ["yes, bisoprolol", LISINOPRIL, DRUG_READ_BACK, ConfirmationReason.CallerRepeatMismatch],
      ["yes, twenty", TEN_MG, STRENGTH_READ_BACK, ConfirmationReason.CallerRepeatMismatch],
    ]
  for (const [reply, subject, readBack, reason] of cases) {
    it(`${reason}: "${reply}" is rejected`, () => {
      const evidence = answered(subject, readBack, reply)
      expect(evidence.verdict, `"${reply}" must never write the value`).toBe("rejected")
      expect(evidence.reasonCode).toBe(reason)
    })
  }

  for (const reply of ["mhm", "uh-huh", "okay", "thank you"]) {
    it(`${ConfirmationReason.CallerBackchannel}: "${reply}" is unclear, not a yes`, () => {
      const evidence = answered(LISINOPRIL, DRUG_READ_BACK, reply)
      expect(evidence.verdict).toBe("unclear")
      expect(evidence.reasonCode).toBe(ConfirmationReason.CallerBackchannel)
    })
  }
})

describe("condition 1: a read-back turn that voiced the value, and for a pair-rule field every partner too", () => {
  it(`${ConfirmationReason.NoReadBackTurn}: no agent turn carried the value`, () => {
    const evidence = judge(LISINOPRIL, [agent(1, "What is the strength?"), caller(2, "yes")])
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.NoReadBackTurn)
    expect(evidence.readBack).toBeNull()
  })

  it(`${ConfirmationReason.ReadBackNotContrastive}: a pair-rule field read back without its partner`, () => {
    const evidence = answered(
      HYDROMORPHONE,
      "Confirming the drug name: hydromorphone. Correct?",
      "hydromorphone",
    )
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.ReadBackNotContrastive)
  })
})

describe("condition 2: the read-back played in full", () => {
  it(`${ConfirmationReason.ReadBackInterrupted}: status interrupted`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, DRUG_READ_BACK, { status: "interrupted", playedMs: 2400 }),
      caller(2, "yes"),
    ])
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.ReadBackInterrupted)
  })

  it(`${ConfirmationReason.ReadBackInterrupted}: completed but played more than 300 ms short`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, DRUG_READ_BACK, { playedMs: 2099, durationMs: 2400 }),
      caller(2, "yes"),
    ])
    expect(evidence.reasonCode).toBe(ConfirmationReason.ReadBackInterrupted)
  })

  it(`${ConfirmationReason.CallerAffirmed}: within the 300 ms tolerance counts as played`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, DRUG_READ_BACK, { playedMs: 2100, durationMs: 2400 }),
      caller(2, "yes"),
    ])
    expect(evidence.verdict).toBe("confirmed")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerAffirmed)
  })
})

describe("condition 3: the caller's next turn is wholly an agreement", () => {
  it(`${ConfirmationReason.NoCallerAnswer}: nothing after the read-back yet`, () => {
    const evidence = judge(LISINOPRIL, [caller(0, "lisinopril"), agent(1, DRUG_READ_BACK)])
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.NoCallerAnswer)
  })

  it(`${ConfirmationReason.CallerNegated}: a plain no`, () => {
    expect(answered(LISINOPRIL, DRUG_READ_BACK, "no").reasonCode).toBe(
      ConfirmationReason.CallerNegated,
    )
  })

  it(`${ConfirmationReason.CallerCorrected}: a different number without a yes`, () => {
    const evidence = answered(TEN_MG, STRENGTH_READ_BACK, "twenty")
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerCorrected)
  })

  it(`${ConfirmationReason.CallerUnclear}: a question back is not an answer`, () => {
    const evidence = answered(LISINOPRIL, DRUG_READ_BACK, "could you repeat that")
    expect(evidence.verdict).toBe("unclear")
  })

  it(`${ConfirmationReason.EchoTurn}: the caller turn is the agent's own read-back`, () => {
    const evidence = answered(LISINOPRIL, DRUG_READ_BACK, DRUG_READ_BACK)
    expect(evidence.verdict).toBe("unclear")
    expect(evidence.reasonCode).toBe(ConfirmationReason.EchoTurn)
  })

  it(`${ConfirmationReason.CallerAffirmed}: an explicit yes, bound to both turns`, () => {
    const evidence = answered(LISINOPRIL, DRUG_READ_BACK, "yes")
    expect(evidence.verdict).toBe("confirmed")
    expect(evidence.readBack?.replyId).toBe("reply-1")
    expect(evidence.callerTurn?.turnOrder).toBe(2)
    expect(evidence.callerTurn?.words.length).toBe(1)
  })
})

describe("condition 4: a repeated value must match", () => {
  it(`${ConfirmationReason.CallerRepeatMismatch}: "yes, morphine" against a hydromorphone read-back with the pair rule off`, () => {
    const evidence = judge(
      HYDROMORPHONE,
      [
        agent(1, "Confirming the drug name: hydromorphone. Correct?"),
        caller(2, "yes, morphine"),
      ],
      false,
    )
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.CallerRepeatMismatch)
  })

  it(`${ConfirmationReason.CallerAffirmed}: "yes, lisinopril" repeats the value`, () => {
    expect(answered(LISINOPRIL, DRUG_READ_BACK, "yes, lisinopril").verdict).toBe("confirmed")
  })

  it(`${ConfirmationReason.CallerAffirmed}: "yes, ten milligrams" repeats 10 mg`, () => {
    expect(answered(TEN_MG, STRENGTH_READ_BACK, "yes, ten milligrams").verdict).toBe(
      "confirmed",
    )
  })
})

describe("condition 5: a newer turn about the same field burns the confirmation", () => {
  it(`${ConfirmationReason.Superseded}: the caller corrects the drug after saying yes`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, DRUG_READ_BACK),
      caller(2, "yes"),
      caller(3, "actually the drug is bisoprolol"),
    ])
    expect(evidence.verdict).toBe("rejected")
    expect(evidence.reasonCode).toBe(ConfirmationReason.Superseded)
  })

  it(`${ConfirmationReason.CallerAffirmed}: an unrelated later turn does not burn it`, () => {
    const evidence = judge(LISINOPRIL, [
      agent(1, DRUG_READ_BACK),
      caller(2, "yes"),
      caller(3, "thirty tablets"),
    ])
    expect(evidence.verdict).toBe("confirmed")
  })
})
