import { describe, expect, it } from "vitest"
import { GateAction, ReasonCode, TERMINAL_ACTIONS, VerdictOutcome } from "@/domain"
import { decide } from "@/gate"
import { buildGateCases } from "./cases"
import { firingRuleName, oracleDecide } from "./oracle"

const CASES = buildGateCases()

describe("the gate agrees with an independently written oracle", () => {
  it("covers a cross-product large enough that agreement is evidence rather than coincidence", () => {
    expect(
      CASES.length,
      "agreement between two implementations over a handful of inputs proves nothing; the cross-product has to be large enough that a divergent branch cannot hide in it",
    ).toBeGreaterThan(5000)
  })

  it("returns the same action as the oracle for every generated input", () => {
    const divergent = CASES.filter(
      (c) =>
        decide(c.candidate, c.policy).action !== oracleDecide(c.candidate, c.policy).action,
    ).map((c) => ({
      label: c.label,
      gate: decide(c.candidate, c.policy).action,
      oracle: oracleDecide(c.candidate, c.policy).action,
      rule: firingRuleName(c.candidate, c.policy),
    }))
    expect(
      divergent,
      "the oracle is written as a priority-ranked rule table rather than a sequence of early returns, so an action they agree on was reached two different ways",
    ).toEqual([])
  })

  it("returns the same reason code as the oracle for every generated input", () => {
    const divergent = CASES.filter(
      (c) =>
        decide(c.candidate, c.policy).reasonCode !==
        oracleDecide(c.candidate, c.policy).reasonCode,
    ).map((c) => ({
      label: c.label,
      gate: decide(c.candidate, c.policy).reasonCode,
      oracle: oracleDecide(c.candidate, c.policy).reasonCode,
      rule: firingRuleName(c.candidate, c.policy),
    }))
    expect(
      divergent,
      "the reason code is what the agent says aloud and what the metrics count, so a branch reaching the right action under the wrong code is still a defect",
    ).toEqual([])
  })

  it("returns the same confirmation mode as the oracle for every generated input", () => {
    const divergent = CASES.filter(
      (c) =>
        decide(c.candidate, c.policy).confirmationMode !==
        oracleDecide(c.candidate, c.policy).confirmationMode,
    ).map((c) => ({
      label: c.label,
      gate: decide(c.candidate, c.policy).confirmationMode,
      oracle: oracleDecide(c.candidate, c.policy).confirmationMode,
      rule: firingRuleName(c.candidate, c.policy),
    }))
    expect(
      divergent,
      "the confirmation mode decides what counts as proof for the value, so disagreeing on it would let a read-back stand in for a validator",
    ).toEqual([])
  })

  it("exercises every oracle rule at least once, so no rule agrees by never firing", () => {
    const fired = new Set(CASES.map((c) => firingRuleName(c.candidate, c.policy)))
    expect(
      fired.size,
      "a rule that never fires agrees with the gate for free; every rule in the table must be exercised or the agreement it contributes is vacuous",
    ).toBeGreaterThanOrEqual(8)
  })

  it("produces every reason code the gate declares except none, so the generator reaches each branch", () => {
    const produced = new Set(CASES.map((c) => decide(c.candidate, c.policy).reasonCode))
    const missing = Object.values(ReasonCode).filter((r) => !produced.has(r))
    expect(
      missing,
      "a reason code the generator never produces is a gate branch this differential check does not cover, and it would read as agreement",
    ).toEqual([])
  })
})

describe("properties that must hold for every gate decision", () => {
  it("never accepts a value whose minimum confidence is under the field threshold", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return (
        d.action === GateAction.Accept &&
        c.candidate.provenance.minConfidence < c.policy.autoAcceptThreshold
      )
    }).map((c) => c.label)
    expect(
      wrong,
      "accepting a value under the field threshold is the first of the three re-ask reasons failing silently",
    ).toEqual([])
  })

  it("never accepts a LASA pair member on a LASA-checked field, at any confidence including 1.0", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return d.action === GateAction.Accept && c.policy.lasaChecked && c.candidate.lasa.hit
    }).map((c) => c.label)
    expect(
      wrong,
      "this is the product's central claim: a published LASA pair is re-asked even at confidence 1.0, so an accept here would refute the whole idea",
    ).toEqual([])
  })

  it("never accepts a value its validator rejected", () => {
    const rejected: readonly VerdictOutcome[] = [
      VerdictOutcome.FailedChecksum,
      VerdictOutcome.FormatInvalid,
      VerdictOutcome.NotInCatalog,
      VerdictOutcome.InconsistentCombo,
    ]
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return d.action === GateAction.Accept && rejected.includes(c.candidate.verdict.outcome)
    }).map((c) => c.label)
    expect(
      wrong,
      "a validator that rejected the value is the second re-ask reason; accepting anyway would make the verdict decorative",
    ).toEqual([])
  })

  it("never accepts a value that failed to normalize, because there is nothing to write", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return d.action === GateAction.Accept && c.candidate.normalizedValue === null
    }).map((c) => c.label)
    expect(
      wrong,
      "a value that did not normalize has nothing writable behind it, so an accept would put an unparsed string into a prescription",
    ).toEqual([])
  })

  it("never accepts a field whose policy demands a read-back every time", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return d.action === GateAction.Accept && c.policy.readBackAlways
    }).map((c) => c.label)
    expect(
      wrong,
      "readBackAlways exists for fields no checksum can prove; accepting one without the read-back removes the only proof it has",
    ).toEqual([])
  })

  it("escalates rather than aborts once a critical field is out of attempts", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return (
        c.candidate.attempt >= c.policy.maxAttemptsBeforeEscalation &&
        c.policy.criticality === "critical" &&
        d.action !== GateAction.EscalateHuman
      )
    }).map((c) => c.label)
    expect(
      wrong,
      "a critical field out of attempts must reach a human rather than be dropped, because silently abandoning it loses the order without telling anyone",
    ).toEqual([])
  })

  it("always returns a declared action and a declared reason code, never an invented one", () => {
    const actions = new Set<string>(Object.values(GateAction))
    const codes = new Set<string>(Object.values(ReasonCode))
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return !actions.has(d.action) || !codes.has(d.reasonCode)
    }).map((c) => c.label)
    expect(
      wrong,
      "an action or code outside the declared unions would pass through the API as an unknown string and the UI would render nothing for it",
    ).toEqual([])
  })

  it("carries a non-empty agent utterance on every decision, because a silent gate cannot re-ask", () => {
    const wrong = CASES.filter(
      (c) => decide(c.candidate, c.policy).agentUtterance.trim() === "",
    ).map((c) => c.label)
    expect(
      wrong,
      "an empty utterance means the agent says nothing while the gate believes it asked, so the caller is never prompted and the field stalls",
    ).toEqual([])
  })

  it("names the field it was asked about and never a different one", () => {
    const wrong = CASES.filter(
      (c) => decide(c.candidate, c.policy).field !== c.candidate.field,
    ).map((c) => c.label)
    expect(
      wrong,
      "a decision naming a different field would apply one field's policy to another's value, which is exactly the confusion the closed field list exists to prevent",
    ).toEqual([])
  })

  it("attaches a confirmation mode to no terminal refusal, because there is nothing to confirm", () => {
    const wrong = CASES.filter((c) => {
      const d = decide(c.candidate, c.policy)
      return (
        TERMINAL_ACTIONS.includes(d.action) &&
        d.action !== GateAction.Accept &&
        d.confirmationMode !== null
      )
    }).map((c) => c.label)
    expect(
      wrong,
      "a terminal refusal carrying a confirmation mode would suggest there is something to confirm when the gate has already given up",
    ).toEqual([])
  })

  it("is a pure function: the same candidate decided twice gives an identical decision", () => {
    const wrong = CASES.filter((c) => {
      const a = decide(c.candidate, c.policy)
      const b = decide(c.candidate, c.policy)
      return JSON.stringify(a) !== JSON.stringify(b)
    }).map((c) => c.label)
    expect(
      wrong,
      "the gate must be a pure function of its inputs, because a decision that varies between calls cannot be reproduced from the stored session",
    ).toEqual([])
  })
})
