import { describe, expect, it } from "vitest"
import { matchesServerRecordedAgentLine } from "@/confirmation"
import { contrastiveUtterance } from "@/gate"

describe("matchesServerRecordedAgentLine: the fifth, server-side anti-echo layer", () => {
  it("flags a turn whose transcript is the re-ask question read back to the server itself", () => {
    const verdict = matchesServerRecordedAgentLine({
      transcript: "did you say Bisoprolol or lisinopril",
      agentLine: "Did you say Bisoprolol or lisinopril?",
    })
    expect(
      verdict.matchesAgent,
      "the exact phrasing the agent used to re-ask about a LASA pair is the highest-risk phantom turn CLAUDE.md names: it contains a drug name and can be recognised as an answer to itself",
    ).toBe(true)
  })

  it("does not flag an unrelated caller turn against an unrelated agent line", () => {
    const verdict = matchesServerRecordedAgentLine({
      transcript: "lisinopril ten milligrams tablet by mouth",
      agentLine: "Confirming the quantity: 30. Correct?",
    })
    expect(verdict.matchesAgent).toBe(false)
  })

  it("returns matchesAgent false when no agent line has been recorded yet", () => {
    const verdict = matchesServerRecordedAgentLine({
      transcript: "anything at all",
      agentLine: null,
    })
    expect(verdict.matchesAgent).toBe(false)
    expect(verdict.matchedAgainst).toBeNull()
  })

  it(
    "does not flag the caller's genuine one-word answer to a disambiguation question, even " +
      "though that exact word appears inside the agent's own long question: a short reply " +
      "sharing one token with a long reference line is the caller answering it, not an echo " +
      "of it, and only checking against the single most recent agent line (not the whole " +
      "decision history) plus a minimum shared-token floor keeps that distinction",
    () => {
      const verdict = matchesServerRecordedAgentLine({
        transcript: "lisinopril",
        agentLine:
          "I heard Bisoprolol. That name is on the published confused-drug-names list together with lisinopril. To be certain: did you say Bisoprolol or lisinopril?",
      })
      expect(verdict.matchesAgent).toBe(false)
    },
  )

  it(
    "is a design boundary, not a proof: a hostile or buggy client could still send a transcript " +
      "the server never said, and this layer only catches a turn that matches something the " +
      "server itself generated, exactly as CLAUDE.md's threat model already states for provenance",
    () => {
      const verdict = matchesServerRecordedAgentLine({
        transcript: "a fabricated transcript naming a drug the caller never said",
        agentLine: "Confirming the drug name: lisinopril. Correct?",
      })
      expect(verdict.matchesAgent).toBe(false)
    },
  )
})

describe("the contrastive read-back and the echo layer do not fight", () => {
  const line = contrastiveUtterance("morphine", ["hydromorphone"])

  for (const answer of [
    "hydromorphone",
    "hydromorphone, H-Y-D",
    "the morphine one",
    "it is morphine",
    "yes, morphine",
    "I said hydromorphone",
  ]) {
    it(`"${answer}" is the caller answering the contrastive question, not an echo of it`, () => {
      expect(
        matchesServerRecordedAgentLine({ transcript: answer, agentLine: line }).matchesAgent,
      ).toBe(false)
    })
  }

  for (const leak of [
    "morphine and hydromorphone are on",
    "which morphine M O R or hydromorphone",
    "published confused drug names list",
  ]) {
    it(`"${leak}" leaking back from the speaker is still refused as an echo`, () => {
      expect(
        matchesServerRecordedAgentLine({ transcript: leak, agentLine: line }).matchesAgent,
      ).toBe(true)
    })
  }
})
