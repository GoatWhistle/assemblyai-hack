import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, GateAction, type GateDecision, REASON_CODES, ReasonCode } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { STANCE_LABEL } from "@/features/field-card/field-status"
import { LasaOverride } from "@/features/field-card/lasa-override"
import { GateBanner } from "@/features/gate-banner"
import {
  ACCUSATION_WORDS,
  HYPOTHESIS_STANCE,
  LASA_NOT_AN_ACCUSATION,
  LASA_STANCE,
  stanceFor,
} from "@/features/gate-banner/hypothesis-language"
import { REASON_LANGUAGE } from "@/features/gate-banner/reason-language"
import { RECOVERY_STEP } from "@/features/gate-banner/recovery-language"
import { RE_ASK_IS_NOT_A_FINDING, REFUSAL_COPY } from "@/features/gate-ledger/refusal-language"
import { RefusalReason } from "@/features/gate-ledger/refusal-tally"
import {
  CIRCULARITY,
  COMPETITOR_CITATION,
  KEYTERMS_AB_LEDE,
  KEYTERMS_ARMS,
  MEASURED_ARM_NOTE,
  NO_MICROPHONE_NOTE,
  WHY_NO_NUMBER,
} from "@/features/judge-demo/keyterms-ab/arms"
import { LASA_CANDIDATE } from "@/features/judge-demo/scenario"
import { SCENARIO_PICKER_LEDE } from "@/features/judge-demo/scenario-picker"
import { SCENARIOS } from "@/features/judge-demo/scenario-picker/scenarios"

function lasaDecision(): GateDecision {
  return {
    action: GateAction.AskDisambiguate,
    reasonCode: ReasonCode.LasaHit,
    field: FieldName.DrugName,
    candidateId: "cand-lasa",
    agentUtterance: "Was that lisinopril or bisoprolol?",
    evidence: { threshold: 0.95, minConfidence: 1 },
    confirmationMode: null,
  }
}

describe("a pair hit is stated as a hypothesis, not as a finding against the caller", () => {
  it("separates what is known from what the re-ask does not assert", () => {
    render(<GateBanner decision={lasaDecision()} />)
    expect(
      screen.getByText(LASA_STANCE.claim),
      "the fact is membership of a published list, and saying so is what stops the hit reading as a verdict about the speaker",
    ).toBeTruthy()
    expect(
      screen.getByText(LASA_STANCE.notClaim),
      "without an explicit statement of what is not known, a caller reads the re-ask as being told they said the wrong drug",
    ).toBeTruthy()
    expect(
      screen.getByText(LASA_STANCE.askedOf),
      "the banner has to land on the ask; a hypothesis with no request is still an accusation with extra words",
    ).toBeTruthy()
  })

  it("says in the stance itself that the caller is usually right", () => {
    expect(
      LASA_STANCE.notClaim.toLowerCase(),
      "the re-ask is the cost side of the idea: roughly a quarter of the questions this product asks land on a value that was already correct, and the wording must not imply otherwise",
    ).toContain("most of the time it was not")
  })

  it("carries no accusing word in any wording a caller or judge reads", () => {
    const wording = [
      ...Object.values(REASON_LANGUAGE).flatMap((entry) => [entry.headline, entry.because]),
      ...Object.values(RECOVERY_STEP)
        .filter((step) => step !== null)
        .flatMap((step) => [step.label, step.detail]),
      ...Object.values(REFUSAL_COPY).map((copy) => copy.label),
      ...Object.values(STANCE_LABEL),
      LASA_STANCE.claim,
      LASA_STANCE.notClaim,
      LASA_STANCE.askedOf,
      LASA_NOT_AN_ACCUSATION,
      RE_ASK_IS_NOT_A_FINDING,
      CIRCULARITY,
      KEYTERMS_AB_LEDE,
      COMPETITOR_CITATION,
      WHY_NO_NUMBER,
      MEASURED_ARM_NOTE,
      NO_MICROPHONE_NOTE,
      SCENARIO_PICKER_LEDE,
      ...KEYTERMS_ARMS.flatMap((arm) => [
        arm.title,
        arm.listLabel,
        arm.pushedToward,
        arm.readBackThenProves,
        arm.whyNotRunnable ?? "",
      ]),
      ...SCENARIOS.flatMap((scenario) => [
        scenario.label,
        scenario.headerNote,
        scenario.whyThisOne,
      ]),
    ]
    for (const text of wording) {
      for (const word of ACCUSATION_WORDS) {
        expect(
          text.toLowerCase(),
          `"${word}" appears in "${text}"; the gate states what it could not prove, never what the caller did wrong`,
        ).not.toContain(word)
      }
    }
  })

  it("gives a stance only to the two reasons that are hypotheses about a signal", () => {
    const withStance = REASON_CODES.filter((code) => stanceFor(code) !== null)
    expect(
      [...withStance].sort(),
      "a checksum failure and a catalogue miss are arithmetic and existence, which are findings; attaching a hedge to them would understate a real proof",
    ).toEqual([ReasonCode.LasaHit, ReasonCode.LowConfidence].sort())
    for (const code of REASON_CODES) {
      expect(
        code in HYPOTHESIS_STANCE,
        `${code} has no entry, so a new gate branch would render with no stance decided either way`,
      ).toBe(true)
    }
  })

  it("keeps the mandatory re-ask at certainty 1.00 while saying it is not an accusation", () => {
    render(<GateBanner decision={lasaDecision()} />)
    expect(
      screen.getByText(REASON_LANGUAGE[ReasonCode.LasaHit].because),
      "softening the wording must not soften the rule: the re-ask fires at confidence 1.00 and the banner still says so",
    ).toBeTruthy()
  })
})

describe("the field card frames the pair hit as something to confirm", () => {
  it("labels the stance as a confirmation rather than as a mandate against the caller", () => {
    expect(
      STANCE_LABEL.lasa.toLowerCase(),
      "the chip is the first thing read on the card, and it has to name the action asked of the caller",
    ).toContain("confirm")
  })

  it("prints the not-an-accusation line beside the certainty it outranks", () => {
    render(<LasaOverride lasa={LASA_CANDIDATE.lasa} minConfidence={1} threshold={0.95} />)
    expect(
      screen.getByText(LASA_NOT_AN_ACCUSATION),
      "the override block is where a confident recognizer is overruled, which is exactly where a caller would read a verdict into it",
    ).toBeTruthy()
  })

  it("reaches the rendered card, not only the override in isolation", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={lasaDecision()} />)
    expect(
      screen.getByText(LASA_NOT_AN_ACCUSATION),
      "a stance that renders only when the block is mounted directly is the dead-component defect one indirection away",
    ).toBeTruthy()
  })
})

describe("the public counter says a count of re-asks is not a count of errors", () => {
  it("states that a re-ask on a correct value is a cost, not a catch", () => {
    expect(
      RE_ASK_IS_NOT_A_FINDING.toLowerCase(),
      "a bare tally beside three reason labels reads as three kinds of caller error unless the screen says otherwise",
    ).toContain("not an error found")
  })

  it("refuses to quote a false-ask figure from this session", () => {
    expect(
      RE_ASK_IS_NOT_A_FINDING.toLowerCase(),
      "false-ask rate is measured on the evaluation set; deriving it from whatever the judge happened to say is a number with no method",
    ).toContain("measured on the evaluation set")
  })

  it("labels the pair reason as sent back for confirming", () => {
    expect(
      REFUSAL_COPY[RefusalReason.LasaPair].label.toLowerCase(),
      "being named on a list reads as being listed as an offender; being sent back for confirming reads as the procedure it is",
    ).toContain("confirm")
  })
})
