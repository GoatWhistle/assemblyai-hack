import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  CandidateStatus,
  type FieldCandidate,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  type ValidatorName,
  VerdictOutcome,
} from "@/domain"
import { GateBanner } from "@/features/gate-banner"
import { GateOutcome, outcomeOf, signatureOf } from "@/features/gate-banner/signature"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"

function candidateOf(input: {
  field: FieldName
  raw: string
  normalized: string
  confidence: number
  outcome: VerdictOutcome
  validator: ValidatorName
  lasa?: boolean
}): FieldCandidate {
  return makeCandidate({
    candidateId: `cand-${input.field}`,
    field: input.field,
    rawValue: input.raw,
    normalizedValue: input.normalized,
    provenance: makeProvenance({
      words: [
        makeWordSpan({
          text: input.raw,
          startMs: 100,
          endMs: 600,
          confidence: input.confidence,
        }),
      ],
      turnOrder: 1,
      transcriptSlice: input.raw,
      sessionId: "signature-test",
      sttTurnIsFormatted: true,
    }),
    verdict: makeVerdict({
      outcome: input.outcome,
      validatorName: input.validator,
      detail: "fixture verdict",
      checkedValue: input.normalized,
    }),
    ...(input.lasa === true ? { lasa: lasaRiskFor(input.normalized) } : {}),
    status: CandidateStatus.Proposed,
    attempt: 1,
    createdAt: "2026-09-25T09:00:00.000Z",
  })
}

const LASA = candidateOf({
  field: FieldName.DrugName,
  raw: "Morphine",
  normalized: "morphine",
  confidence: 1,
  outcome: VerdictOutcome.Passed,
  validator: "ndc_catalog",
  lasa: true,
})

const BAD_NPI = candidateOf({
  field: FieldName.PrescriberNpi,
  raw: "1234567890",
  normalized: "1234567890",
  confidence: 0.99,
  outcome: VerdictOutcome.FailedChecksum,
  validator: "npi_luhn",
})

const GOOD_NPI = candidateOf({
  field: FieldName.PrescriberNpi,
  raw: "1234567893",
  normalized: "1234567893",
  confidence: 0.99,
  outcome: VerdictOutcome.Passed,
  validator: "npi_luhn",
})

function decisionOf(candidate: FieldCandidate) {
  return decide(candidate, policyFor(candidate.field))
}

describe("U3: the signature moment names the outcome, the reason and the candidates", () => {
  it("reads RE-ASK on a published pair even at certainty 1.00, with both candidates", () => {
    const decision = decisionOf(LASA)
    render(<GateBanner decision={decision} candidate={LASA} />)
    expect(screen.getAllByText("RE-ASK").length).toBeGreaterThan(0)
    expect(screen.getByText("certainty 1.00")).toBeTruthy()
    expect(screen.getByText(/published look-alike \(LASA\) pair/)).toBeTruthy()
    expect(
      screen.getByText(
        /candidates: .*Hydromorphone.*Morphine|candidates: .*Morphine.*Hydromorphone/,
      ),
      "the judge has to see both names the recognizer could have meant",
    ).toBeTruthy()
    expect(screen.getAllByText(decision.reasonCode).length).toBeGreaterThan(0)
  })

  it("reads REFUSED when arithmetic rejects the value, whatever the recognizer thought", () => {
    const decision = decisionOf(BAD_NPI)
    expect(outcomeOf(decision)).toBe(GateOutcome.Refused)
    render(<GateBanner decision={decision} candidate={BAD_NPI} />)
    expect(screen.getAllByText("REFUSED").length).toBeGreaterThan(0)
    expect(screen.getByText(/check digit failed/)).toBeTruthy()
  })

  it("reads PASS only when the gate accepted the value", () => {
    const decision = decisionOf(GOOD_NPI)
    expect(decision.action).toBe("accept")
    render(<GateBanner decision={decision} candidate={GOOD_NPI} />)
    expect(screen.getAllByText("PASS").length).toBeGreaterThan(0)
    expect(signatureOf(GOOD_NPI, decision).candidates).toEqual([])
  })

  it("does not print a signature for a candidate the decision is not about", () => {
    render(<GateBanner decision={decisionOf(LASA)} candidate={GOOD_NPI} />)
    expect(screen.queryByText("certainty 0.99")).toBeNull()
  })
})

describe("the verdict is readable in the first frame", () => {
  const motion = readFileSync("src/styles/tokens/motion.css", "utf8")
  const banner = readFileSync("src/features/gate-banner/styles.module.css", "utf8")

  function durationMs(token: string): number {
    return Number(new RegExp(String.raw`${token}:\s*(\d+)ms`).exec(motion)?.[1])
  }

  function firstOpacity(keyframeToken: string): number {
    const name = new RegExp(String.raw`${keyframeToken}:\s*([a-z-]+);`).exec(motion)?.[1] ?? ""
    const block = new RegExp(String.raw`@keyframes ${name} \{\s*from \{([^}]*)\}`).exec(motion)
    expect(block, `the keyframes behind ${keyframeToken} were not found`).not.toBeNull()
    const opacity = /opacity:\s*([\d.]+)/.exec(block?.[1] ?? "")?.[1]
    return opacity === undefined ? 1 : Number(opacity)
  }

  for (const severity of ["accepted", "asking", "lasa", "escalated", "aborted"]) {
    it(`enters the ${severity} verdict within 200 ms and never from invisible`, () => {
      const match = new RegExp(
        String.raw`\.${severity}\s*\{[^}]*animation:\s*var\((--keyframes-[a-z-]+)\)\s*var\((--dur-[a-z-]+)\)`,
      ).exec(banner)
      expect(match, `${severity} has no animation declaration to inspect`).not.toBeNull()
      const [, keyframes = "", duration = ""] = match ?? []
      expect(durationMs(duration), "motion must not delay the verdict").toBeLessThanOrEqual(200)
      expect(
        firstOpacity(keyframes),
        "a verdict that starts transparent is not visible in the first frame",
      ).toBeGreaterThanOrEqual(0.5)
    })
  }
})
