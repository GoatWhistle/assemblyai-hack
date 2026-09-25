import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import {
  ConfirmationReason,
  type FieldPolicy,
  GateAction,
  PAIR_RULE_FLAG,
  policyFor,
  ReasonCode,
} from "@/domain"
import { JudgeDemo } from "@/features/judge-demo"
import {
  DEMO_ARMS,
  DEMO_DURATION_MS,
  NAMED_ANSWER,
  PLAIN_ANSWER,
  productLine,
  RECOGNIZED_AS,
  RECOGNIZER_CERTAINTY,
  SHIPPED_POLICY,
  SPOKEN_TRUTH,
  WITHOUT_PAIR_RULE_POLICY,
} from "@/features/judge-demo/demo-arms"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"

describe("the judge-solo requirement", () => {
  it("needs exactly one click and no microphone", async () => {
    render(<JudgeDemo />)
    const play = screen.getByRole("button", { name: /Play the replay/i })
    await userEvent.click(play)
    expect(screen.getByRole("button", { name: /Stop/i }).hasAttribute("disabled")).toBe(false)
  })

  it("states the ground truth before anything is played", () => {
    render(<JudgeDemo />)
    expect(screen.getByText(/Ground truth for this replay/i)).toBeDefined()
    expect(screen.getAllByText(new RegExp(SPOKEN_TRUTH)).length).toBeGreaterThan(0)
    expect(screen.getAllByText(new RegExp(RECOGNIZED_AS)).length).toBeGreaterThan(0)
  })

  it("says both drugs are opioid pain medicines whose danger is the dose, not the indication", () => {
    render(<JudgeDemo />)
    expect(screen.getByText(/both are opioid pain medicines dosed differently/i)).toBeDefined()
    expect(screen.queryByText(/different conditions/i)).toBeNull()
  })

  it("runs under forty seconds", () => {
    expect(DEMO_DURATION_MS).toBeLessThanOrEqual(40000)
  })
})

describe("the two arms of the contrast", () => {
  const pair = DEMO_ARMS.find((arm) => arm.id === "pair-rule")
  const plain = DEMO_ARMS.find((arm) => arm.id === "plain-read-back")

  it("shows the arm with the pair rule and the arm without it side by side", () => {
    render(<JudgeDemo />)
    expect(screen.getByRole("region", { name: "Pair rule on" })).toBeDefined()
    expect(screen.getByRole("region", { name: "Pair rule off" })).toBeDefined()
  })

  it("marks only the arm with the pair rule as the shipped configuration", () => {
    render(<JudgeDemo />)
    expect(screen.getByText("shipped")).toBeDefined()
    expect(screen.getByText("comparison only")).toBeDefined()
    expect(pair?.policy).toBe(SHIPPED_POLICY)
  })

  it("orders the spoken drug with the pair rule and the misheard one without it", () => {
    expect(pair?.written?.value).toBe(SPOKEN_TRUTH)
    expect(plain?.written?.value).toBe(RECOGNIZED_AS)
    expect(pair?.value.settled).toBe(productLine(SPOKEN_TRUTH))
    expect(plain?.value.settled).toBe(productLine(RECOGNIZED_AS))
  })

  it("writes nothing in either arm between the question and the answer", () => {
    expect(pair?.value.asked).toBe("Nothing yet")
    expect(plain?.value.asked).toBe("Nothing yet")
  })

  it("explains the failure without the pair rule as one no threshold catches", () => {
    expect(plain?.body.settled).toContain("no threshold catches it")
    expect(
      plain?.body.settled,
      "the demo must name the certainty it failed at, at the ceiling, so raising the threshold is visibly not an answer",
    ).toContain(`${RECOGNIZER_CERTAINTY.toFixed(2)}`)
    expect(RECOGNIZER_CERTAINTY).toBe(1)
  })

  it("models the reflex yes as possible, not as what every caller does", () => {
    expect(plain?.body.settled).toContain("can confirm the one read to them")
    expect(plain?.body.settled).not.toContain("confirms the one read to them")
  })

  it("names both alternatives in the shipped arm's question", () => {
    expect(pair?.agentLine).toContain(LASA_CANDIDATE.lasa.matchedTerm)
    for (const partner of LASA_CANDIDATE.lasa.confusableWith) {
      expect(pair?.agentLine).toContain(partner)
    }
  })

  it("says in the shipped arm that a reflexive yes would have written nothing", () => {
    expect(pair?.body.settled).toContain(ConfirmationReason.LasaNamedAnswerRequired)
    expect(pair?.body.asked).toContain(ConfirmationReason.LasaNamedAnswerRequired)
  })

  it("states the contrast before anything is played, so the page explains itself at rest", () => {
    render(<JudgeDemo />)
    expect(screen.getByText(String(pair?.value.resting))).toBeDefined()
    expect(screen.getByText(String(plain?.value.resting))).toBeDefined()
    expect(String(plain?.value.resting)).toContain(RECOGNIZED_AS)
    expect(screen.queryByText(/not reached yet/)).toBeNull()
  })

  it("marks the outcome as prospective before playback", () => {
    render(<JudgeDemo />)
    expect(screen.getAllByText(/what the agent will say/i).length).toBe(2)
    expect(screen.getAllByText(/what the caller will answer/i).length).toBe(2)
  })
})

describe("S0: the arms differ by exactly one policy flag, the pair rule", () => {
  it("changes one key of the policy and nothing else", () => {
    const keys = Object.keys(SHIPPED_POLICY) as (keyof FieldPolicy)[]
    const differing = keys.filter(
      (key) => SHIPPED_POLICY[key] !== WITHOUT_PAIR_RULE_POLICY[key],
    )
    expect(differing, "AU6-P0-03: the comparison arm once switched off two flags").toEqual([
      PAIR_RULE_FLAG,
    ])
    expect(SHIPPED_POLICY.lasaChecked).toBe(true)
    expect(WITHOUT_PAIR_RULE_POLICY.readBackAlways).toBe(true)
  })

  it("runs the comparison arm through the shipped read-back, not a threshold alone", () => {
    const plain = DEMO_ARMS.find((arm) => arm.id === "plain-read-back")
    expect(plain?.decision.action).toBe(GateAction.AskConfirm)
    expect(plain?.decision.reasonCode).toBe(ReasonCode.ReadBackRequired)
    expect(plain?.agentLine).toContain(RECOGNIZED_AS)
    for (const partner of LASA_CANDIDATE.lasa.confusableWith) {
      expect(plain?.agentLine, "a plain read-back names only the heard drug").not.toContain(
        partner,
      )
    }
  })

  it("has the caller answer yes to the plain read-back and name the drug to the contrastive one", () => {
    const [pair, plain] = DEMO_ARMS
    expect(plain?.answer.callerSaid).toBe(PLAIN_ANSWER)
    expect(plain?.answer.reasonCode).toBe(ConfirmationReason.CallerAffirmed)
    expect(pair?.answer.callerSaid).toBe(NAMED_ANSWER)
    expect(pair?.answer.reasonCode).toBe(ConfirmationReason.CallerNamedPartner)
  })
})

describe("the scenario behind the demo", () => {
  it("carries a certainty at or above the drug-name threshold", () => {
    expect(RECOGNIZER_CERTAINTY).toBeGreaterThanOrEqual(
      policyFor(LASA_CANDIDATE.field).autoAcceptThreshold,
    )
    expect(LASA_CANDIDATE.provenance.minConfidence).toBeGreaterThanOrEqual(0.95)
  })

  it("carries a passing validator verdict, so only the pair table objects", () => {
    expect(LASA_CANDIDATE.verdict.outcome).toBe("passed")
    expect(LASA_CANDIDATE.lasa.hit).toBe(true)
  })

  it("resolves to ask_disambiguate with the LASA reason code", () => {
    expect(LASA_DECISION.action).toBe(GateAction.AskDisambiguate)
    expect(LASA_DECISION.reasonCode).toBe(ReasonCode.LasaHit)
  })

  it("records in its evidence that the ask is by design, not by threshold", () => {
    expect(String(LASA_DECISION.evidence.note)).toContain("regardless of confidence")
  })
})

describe("the demonstration computes its refusal instead of printing one", () => {
  it("shows the agent lines the gate raised, not strings written into the page", () => {
    const [pair, plain] = DEMO_ARMS
    expect(pair?.agentLine).toBe(decide(LASA_CANDIDATE, SHIPPED_POLICY).agentUtterance)
    expect(plain?.agentLine).toBe(
      decide(LASA_CANDIDATE, WITHOUT_PAIR_RULE_POLICY).agentUtterance,
    )
    render(<JudgeDemo />)
    expect(screen.getAllByText(String(pair?.agentLine)).length).toBeGreaterThan(0)
    expect(screen.getByText(String(plain?.agentLine))).toBeDefined()
  })

  it("prints each arm's reason codes on screen, so every outcome is attributable", () => {
    render(<JudgeDemo />)
    expect(screen.getAllByText(ReasonCode.LasaHit).length).toBeGreaterThan(0)
    expect(screen.getAllByText(ReasonCode.ReadBackRequired).length).toBeGreaterThan(0)
    expect(screen.getAllByText(ConfirmationReason.CallerNamedPartner).length).toBeGreaterThan(0)
    expect(screen.getAllByText(ConfirmationReason.CallerAffirmed).length).toBeGreaterThan(0)
  })

  it("takes the pair citation from the curated table rather than from the page", () => {
    expect(LASA_CANDIDATE.lasa.sourceRow).toBe(lasaRiskFor(RECOGNIZED_AS).sourceRow)
    expect(LASA_CANDIDATE.lasa.hit).toBe(true)
  })
})
