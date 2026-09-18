import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import {
  CANCELLING,
  CONFIRMING,
  DENYING,
  normalizeAnswer,
} from "@/features/read-back/answer-vocabulary"
import { FastPathAction, fastPathFor, NO_FAST_PATH } from "@/features/read-back/fast-path"
import {
  classifyHeard,
  initialContext,
  ReadBackState,
  reduceReadBack,
} from "@/features/read-back/read-back-machine"

const SERVER_ROUTE = "app/api/tools/read-back/route.ts"

function serverList(name: string): readonly string[] {
  const source = readFileSync(SERVER_ROUTE, "utf8")
  const block = new RegExp(`const ${name} = \\[([^\\]]*)\\]`).exec(source)
  expect(
    block,
    `${name} was not found in ${SERVER_ROUTE}; the browser cannot agree with a list it can no longer read, and a silently missing list would let this test pass while proving nothing`,
  ).not.toBeNull()
  return [...(block?.[1] ?? "").matchAll(/"([^"]*)"/g)].map((match) => match[1] ?? "")
}

describe("the two answer vocabularies cannot drift apart", () => {
  it("holds exactly the server's confirming words, because a yes the server refuses must not show as a yes here", () => {
    expect(
      [...CONFIRMING].sort(),
      "a word the browser accepts and the server does not renders a confirmation that never wrote anything",
    ).toEqual([...serverList("CONFIRMING")].sort())
  })

  it("holds exactly the server's denying words", () => {
    expect(
      [...DENYING].sort(),
      "a denial the browser misses leaves the screen waiting while the server has already moved on",
    ).toEqual([...serverList("DENYING")].sort())
  })

  it("strips the same punctuation the server strips, comma included", () => {
    const source = readFileSync(SERVER_ROUTE, "utf8")
    expect(
      source,
      "a formatted transcript inserts a comma after yes; a browser that keeps it loses a genuine confirmation the server accepted",
    ).toContain('.replace(/[.!?,]/g, "")')
    expect(normalizeAnswer(" Yes, ")).toBe("yes")
  })

  it("agrees with the server's own classifier over a corpus of real recognizer output", () => {
    const corpus = [
      "yes",
      "Yes,",
      "yeah, that is the one",
      "correct",
      "that's right",
      "confirmed",
      "right",
      "no",
      "nope",
      "wrong",
      "not quite",
      "negative",
      "uh-huh",
      "Aha",
      "mhm",
      "mm-hmm",
      "hmm",
      "Lisinopril, ten milligrams",
      "it is 10 mg",
      "",
      "   ",
      "that is incorrect",
      "yes, Lisinopril, ten milligrams",
    ]
    const asServer: Readonly<Record<string, string>> = {
      affirmed: "confirmed",
      denied: "rejected",
      cancelled: "unclear",
      unclear: "unclear",
    }
    const browser = corpus.map((entry) => asServer[classifyHeard(entry)])
    const confirming = serverList("CONFIRMING")
    const denying = serverList("DENYING")
    const server = corpus.map((entry) => {
      const text = normalizeAnswer(entry)
      if (confirming.some((c) => text === c || text.startsWith(`${c} `))) {
        return "confirmed"
      }
      if (denying.some((d) => text === d || text.startsWith(`${d} `))) {
        return "rejected"
      }
      return "unclear"
    })
    expect(
      browser,
      "every disagreement here is a screen that says one thing while the order holds another",
    ).toEqual(server)
  })

  it("keeps cancellation out of the confirming and denying lists, so it can never read as consent", () => {
    for (const word of CANCELLING) {
      expect(
        CONFIRMING,
        `${word} cancels the read-back; treated as a yes it would write a value the caller was trying to withdraw`,
      ).not.toContain(word)
      expect(classifyHeard(word)).toBe("cancelled")
    }
  })

  it("does not let a cancellation reach the server as a confirmation", () => {
    expect(
      serverList("CONFIRMING").some((word) => CANCELLING.includes(word)),
      "the server has no cancel vocabulary; a cancel that mapped onto a server confirming word would write the value",
    ).toBe(false)
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
