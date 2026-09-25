import { describe, expect, it } from "vitest"
import { EchoGuard } from "@/audio/echo-guard"
import { isEchoOf, matchesServerRecordedAgentLine } from "@/confirmation"
import { contrastiveUtterance } from "@/gate"

const LINE = contrastiveUtterance("morphine", ["hydromorphone"])

const ANSWERS = [
  "hydromorphone",
  "hydromorphone, H-Y-D",
  "the morphine one",
  "it is morphine",
  "yes, morphine",
  "I said hydromorphone",
]

const LEAKS = [
  "morphine and hydromorphone are on",
  "which morphine M O R or hydromorphone",
  "published confused drug names list",
]

function duringPlayback(transcript: string): boolean {
  const guard = new EchoGuard()
  guard.replyStarted()
  guard.noteAgentTranscript(LINE)
  return guard.inspectTurn(transcript).discard
}

describe("S0: the browser echo guard lets a spelled answer to the contrastive question through", () => {
  for (const answer of ANSWERS) {
    it(`"${answer}" is kept, as the server keeps it`, () => {
      expect(isEchoOf(answer, LINE)).toBe(false)
      expect(duringPlayback(answer)).toBe(false)
      expect(
        matchesServerRecordedAgentLine({ transcript: answer, agentLine: LINE }).matchesAgent,
      ).toBe(false)
    })
  }

  for (const leak of LEAKS) {
    it(`"${leak}" is still discarded, as the server refuses it`, () => {
      expect(duringPlayback(leak)).toBe(true)
      expect(
        matchesServerRecordedAgentLine({ transcript: leak, agentLine: LINE }).matchesAgent,
      ).toBe(true)
    })
  }
})
