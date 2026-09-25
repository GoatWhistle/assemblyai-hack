import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { EchoGuard } from "@/audio/echo-guard"
import { isEchoOf, matchesServerRecordedAgentLine } from "@/confirmation"
import { distinguishingCue, lasaUtterance } from "@/gate"
import { LASA_PAIRS, lasaRiskFor } from "@/lasa"

function browserDiscards(transcript: string, line: string): boolean {
  const guard = new EchoGuard()
  guard.replyStarted()
  guard.noteAgentTranscript(line)
  return guard.inspectTurn(transcript).discard
}

function namesOnList(): readonly string[] {
  const names = new Set<string>(["hydromorphone"])
  for (const pair of LASA_PAIRS) {
    names.add(pair.termA)
    names.add(pair.termB)
  }
  return [...names]
}

function answersTo(heard: string, partners: readonly string[]): readonly string[] {
  const options = [heard, ...partners]
  return options.flatMap((name) => {
    const cue = distinguishingCue(
      name,
      options.filter((other) => other !== name),
    )
    return [name, `${name}, ${cue}`, `the ${name} one`, `yes, ${name}`, `I said ${name}`]
  })
}

function leaksOf(line: string): readonly string[] {
  const words = line.split(" ")
  return [
    line,
    words.slice(0, 5).join(" "),
    line.slice(line.indexOf("Which:")),
    "published confused drug names list",
  ]
}

describe("the browser echo guard has no echo arithmetic of its own", () => {
  it("imports the overlap test from the package the server uses, and declares no threshold", () => {
    const source = readFileSync("src/audio/echo-guard.ts", "utf8")
    expect(source).toContain('from "@/confirmation"')
    expect(source).not.toMatch(/ECHO_MATCH_THRESHOLD\s*=|function normalize|toLowerCase/)
  })
})

describe("the echo guard over every contrastive question the list can produce", () => {
  const names = namesOnList()

  it("covers a name with several partners, not only the two-name case", () => {
    expect(names.some((name) => lasaRiskFor(name).confusableWith.length > 2)).toBe(true)
  })

  for (const name of names) {
    const risk = lasaRiskFor(name)
    if (!risk.hit) {
      continue
    }
    const line = lasaUtterance(risk)
    const partners = [...risk.confusableWith]

    it(`${name}: a spoken single name, spelled or not, is never taken for an echo`, () => {
      for (const answer of answersTo(String(risk.matchedTerm), partners)) {
        if (!answer.includes(" ") || /^\S+, [A-Z](-[A-Z])*$/.test(answer)) {
          expect(browserDiscards(answer, line), answer).toBe(false)
          expect(
            matchesServerRecordedAgentLine({ transcript: answer, agentLine: line })
              .matchesAgent,
            answer,
          ).toBe(false)
        }
      }
    })

    it(`${name}: the question leaking back is discarded`, () => {
      for (const leak of leaksOf(line)) {
        expect(isEchoOf(leak, line), leak).toBe(true)
        expect(browserDiscards(leak, line), leak).toBe(true)
      }
    })
  }
})
