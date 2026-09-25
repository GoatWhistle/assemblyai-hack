import { readFileSync } from "node:fs"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReasonCode } from "@/domain"
import { TOUR_SECONDS, TOUR_STEPS } from "@/features/how-it-works/judge-tour/tour-steps"
import { SAY_THESE } from "@/features/judge-demo/say-these/phrases"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"

const { default: HomePage } = await import("@app/(pages)/page")

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === REDUCED_MOTION_QUERY,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function renderHome(search: Record<string, string>) {
  render(await HomePage({ searchParams: Promise.resolve(search) }))
}

describe("U1: the root is the judge's first screen", () => {
  it("offers the replay and the live call as real links that work before hydration", async () => {
    await renderHome({})
    const watch = screen.getByRole("link", { name: /watch the 40-second case/i })
    expect(watch.getAttribute("href")).toBe("/?judge=1#replay")
    const talk = screen.getByRole("link", { name: /talk to it live/i })
    expect(talk.getAttribute("href")).toBe("/live")
    expect(screen.getByText(/who pays/i)).toBeTruthy()
    expect(screen.getByText(/who gets the order/i)).toBeTruthy()
  })

  it("names the three things to say with outcomes computed by the shipped gate", async () => {
    await renderHome({})
    const block = screen.getByRole("region", { name: "Say these three things" })
    const byId = new Map(SAY_THESE.map((entry) => [entry.id, entry]))
    expect(byId.get("lasa")?.decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(byId.get("lasa")?.outcome).toBe("RE-ASK")
    expect(byId.get("lasa")?.candidate.provenance.minConfidence).toBe(1)
    expect(
      byId.get("clean")?.decision.reasonCode,
      "the clean phrase must name a drug in no published pair, or it demonstrates the pair rule twice",
    ).toBe(ReasonCode.ReadBackRequired)
    expect(byId.get("npi")?.decision.reasonCode).toBe(ReasonCode.ValidatorChecksum)
    expect(byId.get("npi")?.outcome).toBe("REFUSED")
    for (const entry of SAY_THESE) {
      expect(within(block).getByText(entry.decision.reasonCode)).toBeTruthy()
    }
  })

  it("opens the replay first and lets it start itself under ?judge=1", async () => {
    await renderHome({ judge: "1" })
    const replay = screen.getByRole("region", { name: "Replay" })
    const heading = screen.getAllByRole("heading", { level: 1 })[0]
    expect(replay.contains(heading ?? null)).toBe(true)
  })

  it("carries the medical disclaimer", async () => {
    await renderHome({})
    expect(screen.getByText(/not a medical device/i)).toBeTruthy()
  })
})

describe("U10: the judge tour fits in ninety seconds and points at real routes", () => {
  it("sums to no more than ninety seconds", () => {
    expect(TOUR_SECONDS).toBeLessThanOrEqual(90)
  })

  it("links every step to a page that exists", () => {
    for (const step of TOUR_STEPS) {
      const path = step.href.split(/[?#]/)[0] ?? ""
      const file = path === "/" ? "app/(pages)/page.tsx" : `app/(pages)${path}/page.tsx`
      expect(() => readFileSync(file, "utf8"), `${step.id} points at ${path}`).not.toThrow()
    }
  })
})
