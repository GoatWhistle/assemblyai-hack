import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { MAX_SESSION_ID_CHARS } from "@/domain"
import { MAX_LIVE_SESSIONS, MAX_TURNS_PER_SESSION } from "@/tools"
import { MAX_WORDS_PER_TURN } from "../../app/api/sessions/[id]/turns/route"

const README = readFileSync("README.md", "utf8")

describe("an incomplete honest disclosure is worse than none, so the text is held to the code", () => {
  it("names the limitation at full strength rather than softening it", () => {
    expect(README).toContain("client-supplied")
    expect(README).toMatch(/arbitrary words with arbitrary timings/)
  })

  it("says the route is unauthenticated by design and why", () => {
    expect(README).toMatch(/deliberately unauthenticated/)
    expect(README).toMatch(/cannot hold the shared tool secret/)
  })

  it("draws the distinction the gate actually guarantees", () => {
    expect(README).toMatch(/proves provenance, not truth/)
  })

  it("does not claim the forged case is prevented, only that resources are bounded", () => {
    expect(README).not.toMatch(/provenance is (verified|trusted|guaranteed) server-side/i)
    expect(README).toMatch(/resource isolation/)
  })

  it("publishes every bound the route enforces, and the numbers match the code", () => {
    expect(README).toContain(`${MAX_WORDS_PER_TURN} words per turn`)
    expect(README).toContain(`${MAX_TURNS_PER_SESSION} turns per session`)
    expect(README).toContain(`${MAX_LIVE_SESSIONS} concurrent sessions`)
    expect(README).toContain(`${MAX_SESSION_ID_CHARS} characters`)
  })

  it("keeps saying the audio route would need an always-on host, which is the trade we made", () => {
    expect(README).toMatch(/always-on process/)
  })
})
