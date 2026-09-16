import { describe, expect, it } from "vitest"
import { ConfirmationMode, FieldName, SpellOutStyle } from "@/domain"
import {
  classifyHeard,
  initialContext,
  ReadBackState,
  reduceReadBack,
} from "@/features/read-back/read-back-machine"
import {
  NATO,
  SPELL_INSTRUCTION,
  spellPhrase,
  spellTokens,
} from "@/features/read-back/spell-out"

function awaiting(overrides = {}) {
  return reduceReadBack(
    initialContext({ expectedValue: "Lisinopril", maxAttempts: 3, ...overrides }),
    {
      type: "request",
      field: FieldName.DrugName,
      utterance: "Confirming Lisinopril. Correct?",
    },
  )
}

describe("read-back transitions", () => {
  it("starts idle and moves to awaiting on a request", () => {
    expect(initialContext().state).toBe(ReadBackState.Idle)
    const context = awaiting()
    expect(context.state).toBe(ReadBackState.AwaitingConfirmation)
    expect(context.field).toBe(FieldName.DrugName)
    expect(context.attempts).toBe(1)
  })

  it("matches on an affirmative answer and records read-back as the mode", () => {
    const context = reduceReadBack(awaiting(), { type: "heard", text: "Yes, that is right." })
    expect(context.state).toBe(ReadBackState.Matched)
    expect(context.confirmationMode).toBe(ConfirmationMode.ReadBack)
  })

  it("matches when the caller restates the value rather than saying yes", () => {
    const context = reduceReadBack(awaiting(), {
      type: "heard",
      text: "Lisinopril, ten milligrams",
    })
    expect(context.state).toBe(ReadBackState.Matched)
  })

  it("fails on a denial while attempts remain", () => {
    const context = reduceReadBack(awaiting(), { type: "heard", text: "No, that is wrong" })
    expect(context.state).toBe(ReadBackState.Failed)
    expect(context.heard).toBe("No, that is wrong")
  })

  it("escalates instead of failing once the attempt budget is spent", () => {
    const context = reduceReadBack(awaiting({ attempts: 2 }), { type: "heard", text: "No" })
    expect(context.state).toBe(ReadBackState.Escalated)
  })

  it("enters spell-out and records spell-out as the mode when it then matches", () => {
    const spelling = reduceReadBack(awaiting(), { type: "enter_spell_out" })
    expect(spelling.state).toBe(ReadBackState.SpellOut)
    const matched = reduceReadBack(spelling, { type: "heard", text: "Lisinopril" })
    expect(matched.state).toBe(ReadBackState.Matched)
    expect(matched.confirmationMode).toBe(ConfirmationMode.SpellOut)
  })

  it("refuses to leave a matched state through spell-out", () => {
    const matched = reduceReadBack(awaiting(), { type: "heard", text: "yes" })
    expect(reduceReadBack(matched, { type: "enter_spell_out" }).state).toBe(
      ReadBackState.Matched,
    )
  })

  it("escalates on demand and drops any confirmation mode", () => {
    const context = reduceReadBack(awaiting(), { type: "escalate" })
    expect(context.state).toBe(ReadBackState.Escalated)
    expect(context.confirmationMode).toBeNull()
  })

  it("ignores a heard event when nothing was asked", () => {
    const idle = initialContext()
    expect(reduceReadBack(idle, { type: "heard", text: "yes" }).state).toBe(ReadBackState.Idle)
  })

  it("resets to idle while keeping the field policy settings", () => {
    const context = reduceReadBack(awaiting({ spellOutStyle: SpellOutStyle.Nato }), {
      type: "reset",
    })
    expect(context.state).toBe(ReadBackState.Idle)
    expect(context.maxAttempts).toBe(3)
    expect(context.spellOutStyle).toBe(SpellOutStyle.Nato)
  })
})

describe("classifyHeard", () => {
  it("reads the common affirmations and denials", () => {
    expect(classifyHeard("yes", "x")).toBe("affirmed")
    expect(classifyHeard("correct", "x")).toBe("affirmed")
    expect(classifyHeard("no", "x")).toBe("denied")
    expect(classifyHeard("that is incorrect", "x")).toBe("unclear")
    expect(classifyHeard("nope", "x")).toBe("denied")
  })

  it("reads a restatement of the expected value as a confirmation", () => {
    expect(classifyHeard("ten milligrams", "10 mg")).toBe("unclear")
    expect(classifyHeard("it is 10 mg", "10 mg")).toBe("restated")
  })

  it("reads silence as unclear rather than as consent", () => {
    expect(classifyHeard("", "10 mg")).toBe("unclear")
    expect(classifyHeard("   ", "10 mg")).toBe("unclear")
  })
})

describe("spell-out", () => {
  it("spells letters with the NATO alphabet", () => {
    expect(spellPhrase("AB1", SpellOutStyle.Nato)).toBe("Alfa Bravo one")
    expect(NATO.J).toBe("Juliett")
  })

  it("spells numbers digit by digit and drops the separators", () => {
    expect(spellPhrase("124-53", SpellOutStyle.Digits)).toBe("one two four five three")
  })

  it("returns the value unchanged when no spell-out style applies", () => {
    expect(spellPhrase("once daily", SpellOutStyle.None)).toBe("once daily")
    expect(spellTokens("", SpellOutStyle.None)).toEqual([])
  })

  it("pairs each source character with its spoken form for display", () => {
    const tokens = spellTokens("A9", SpellOutStyle.Nato)
    expect(tokens).toEqual([
      { source: "A", spoken: "Alfa" },
      { source: "9", spoken: "nine" },
    ])
  })

  it("gives an instruction for each style", () => {
    expect(SPELL_INSTRUCTION.nato).toContain("Alfa")
    expect(SPELL_INSTRUCTION.digits).toContain("one digit at a time")
    expect(SPELL_INSTRUCTION.none.length).toBeGreaterThan(0)
  })
})
