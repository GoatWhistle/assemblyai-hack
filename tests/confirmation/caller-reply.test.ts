import { describe, expect, it } from "vitest"
import { classifyCallerReply, classifyPlainAnswer } from "@/confirmation"

const CORPUS = [
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
  "okay",
  "yes okay",
  "thank you",
  "Lisinopril, ten milligrams",
  "it is 10 mg",
  "",
  "   ",
  "that is incorrect",
  "yes, Lisinopril, ten milligrams",
  "yeah, no",
  "yes but the dose is wrong",
  "right, no, twenty",
  "yes, bisoprolol",
  "yes, twenty",
  "cancel that",
  "scratch that",
]

describe("the value-free reading of an answer is a restriction of the value-aware one", () => {
  it("never reads a yes the value-aware classifier refuses, nor a no it accepts", () => {
    for (const valueText of ["Lisinopril", "10 mg", "1234567893", ""]) {
      for (const entry of CORPUS) {
        const plain = classifyPlainAnswer(entry)
        const full = classifyCallerReply({ text: entry, valueText }).verdict
        if (plain === "affirmed") {
          expect(full, `"${entry}" for ${valueText}`).toBe("confirmed")
        }
        if (plain === "denied") {
          expect(full, `"${entry}" for ${valueText}`).toBe("rejected")
        }
      }
    }
  })

  it("reads the three phrases an older classifier waved through as refusals", () => {
    for (const phrase of ["yeah, no", "yes but the dose is wrong", "right, no, twenty"]) {
      expect(classifyPlainAnswer(phrase), `${phrase} is not consent`).toBe("denied")
      expect(classifyCallerReply({ text: phrase, valueText: "10 mg" }).verdict).toBe("rejected")
    }
  })

  it("reads a vocalised agreement and silence as unclear, never as a yes", () => {
    for (const heard of ["uh-huh", "Aha", "mhm", "mm-hmm", "uh huh", "hmm", "", "   "]) {
      expect(classifyPlainAnswer(heard), heard).toBe("unclear")
    }
  })

  it("does not read a restatement of the value alone as a confirmation", () => {
    expect(classifyPlainAnswer("ten milligrams")).toBe("unclear")
    expect(classifyPlainAnswer("it is 10 mg")).toBe("unclear")
    expect(classifyPlainAnswer("yes, Lisinopril")).toBe("unclear")
  })

  it("takes a backchannel beside a yes as a yes, as the value-aware classifier does", () => {
    expect(classifyPlainAnswer("yes okay")).toBe("affirmed")
    expect(classifyCallerReply({ text: "yes okay", valueText: "10 mg" }).verdict).toBe(
      "confirmed",
    )
  })
})
