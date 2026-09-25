import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { classifyCallerReply, classifyPlainAnswer } from "@/confirmation"
import { AFFIRMATIONS, FieldName } from "@/domain"
import { CANCELLING, normalizeAnswer } from "@/features/read-back/answer-vocabulary"
import { FastPathAction, fastPathFor, NO_FAST_PATH } from "@/features/read-back/fast-path"
import {
  classifyHeard,
  initialContext,
  ReadBackState,
  reduceReadBack,
} from "@/features/read-back/read-back-machine"

describe("the browser reads answers with the server's own classifier", () => {
  it("holds no confirming or refusing vocabulary of its own", () => {
    const vocabulary = readFileSync("src/features/read-back/answer-vocabulary.ts", "utf8")
    const machine = readFileSync("src/features/read-back/read-back-machine.ts", "utf8")
    for (const source of [vocabulary, machine]) {
      expect(source).not.toMatch(/AFFIRMATIONS|NEGATIONS|CORRECTIONS|BACKCHANNELS|FILLERS/)
    }
    expect(machine).toContain('from "@/confirmation"')
  })

  it("returns the shared classifier's verdict for everything that is not a cancellation", () => {
    for (const phrase of ["yes", "Yes,", "no", "yeah, no", "uh-huh", "it is 10 mg", ""]) {
      expect(classifyHeard(phrase), phrase).toBe(classifyPlainAnswer(phrase))
    }
  })

  it("strips the same punctuation a formatted transcript inserts", () => {
    expect(normalizeAnswer(" Yes, ")).toBe("yes")
    expect(classifyHeard("Yes,")).toBe("affirmed")
  })

  it("keeps cancellation out of the confirming list, so it can never read as consent", () => {
    for (const word of CANCELLING) {
      expect(
        AFFIRMATIONS.has(word),
        `${word} cancels the read-back; treated as a yes it would write a value the caller was trying to withdraw`,
      ).toBe(false)
      expect(classifyHeard(word)).toBe("cancelled")
    }
  })

  it("does not let a cancellation reach the server as a confirmation", () => {
    for (const word of CANCELLING) {
      expect(
        classifyCallerReply({ text: word, valueText: "Lisinopril" }).verdict,
        "the server has no cancel vocabulary; a cancel it read as a yes would write the value",
      ).not.toBe("confirmed")
    }
  })
})

describe("the local fast path answers without waiting for a model round trip", () => {
  function awaiting() {
    return reduceReadBack(initialContext({ expectedValue: "Lisinopril", maxAttempts: 3 }), {
      type: "request",
      field: FieldName.DrugName,
      utterance: "Confirming Lisinopril?",
    })
  }

  it("reads a yes as an affirmation and still leaves the write to the server", () => {
    const fast = fastPathFor(ReadBackState.AwaitingConfirmation, "Yes, that's right")
    expect(fast.action).toBe(FastPathAction.Affirm)
    expect(
      fast.awaitsServer,
      "an optimistic yes that claimed the write would be a screen that lies about the order",
    ).toBe(true)
    expect(
      fast.endpointNow,
      "the whole point is closing the turn at once rather than waiting out the endpoint silence",
    ).toBe(true)
  })

  it("reads a no without waiting, and does not claim the server will write anything", () => {
    const fast = fastPathFor(ReadBackState.AwaitingConfirmation, "No")
    expect(fast.action).toBe(FastPathAction.Deny)
    expect(fast.awaitsServer).toBe(false)
    expect(fast.endpointNow).toBe(true)
  })

  it("reads a cancellation as a cancellation, not as a denial", () => {
    const fast = fastPathFor(ReadBackState.AwaitingConfirmation, "cancel that")
    expect(
      fast.action,
      "a cancel folded into a denial would start another attempt on a field the caller abandoned",
    ).toBe(FastPathAction.Cancel)
  })

  it("refuses a vocalised agreement, so a guessed noise never shortcuts the loop", () => {
    for (const noise of ["uh-huh", "Aha", "mhm", "mm-hmm", "hmm"]) {
      expect(
        fastPathFor(ReadBackState.AwaitingConfirmation, noise).action,
        `${noise} burned two of three re-asks for a competitor; a fast path that accepted it would be faster at being wrong`,
      ).toBe(FastPathAction.None)
    }
  })

  it("refuses a bare value with no verb", () => {
    expect(
      fastPathFor(ReadBackState.AwaitingConfirmation, "Lisinopril, ten milligrams").action,
      "a confirmation must not evaporate while the value it confirmed survives",
    ).toBe(FastPathAction.None)
  })

  it("stays silent when no read-back is open, so an ordinary yes mid-dictation is not an answer", () => {
    expect(fastPathFor(ReadBackState.Idle, "yes")).toEqual(NO_FAST_PATH)
    expect(fastPathFor(ReadBackState.Matched, "yes").action).toBe(FastPathAction.None)
  })

  it("is available during spell-out too, because that is where the caller is slowest", () => {
    expect(fastPathFor(ReadBackState.SpellOut, "correct").action).toBe(FastPathAction.Affirm)
  })

  it("moves the machine to cancelled rather than failed, and spell-out cannot reopen it", () => {
    const cancelled = reduceReadBack(awaiting(), { type: "heard", text: "cancel" })
    expect(cancelled.state).toBe(ReadBackState.Cancelled)
    expect(
      reduceReadBack(cancelled, { type: "enter_spell_out" }).state,
      "a cancelled read-back that reopened into spell-out would re-ask a field the caller called off",
    ).toBe(ReadBackState.Cancelled)
  })
})
