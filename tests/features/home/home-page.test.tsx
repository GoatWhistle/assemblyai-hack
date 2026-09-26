import { existsSync, readFileSync } from "node:fs"
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReasonCode } from "@/domain"
import { TOUR_SECONDS, TOUR_STEPS } from "@/features/how-it-works/judge-tour/tour-steps"
import { DEMO_DURATION_MS } from "@/features/judge-demo/demo-arms"
import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { HERO_CLAIM } from "@/features/judge-demo/judge-hero"
import { REPLAY_SECONDS } from "@/features/judge-demo/replay-clock"
import { SAY_THESE } from "@/features/judge-demo/say-these/phrases"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"

const { default: CallPage } = await import("@app/(pages)/page")
const { default: DemoPage } = await import("@app/(pages)/demo/page")
const { default: LivePage } = await import("@app/(pages)/live/page")
const { default: StartPage } = await import("@app/(pages)/start/page")

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

async function renderDemo(search: Record<string, string>) {
  render(await DemoPage({ searchParams: Promise.resolve(search) }))
}

function redirectTarget(run: () => unknown): string {
  try {
    run()
  } catch (error) {
    return String((error as { digest?: string }).digest ?? "")
  }
  return ""
}

describe("U1: the root is the call, and every judge entry lands on the replay", () => {
  it("renders the live intake at the root", () => {
    const page = readFileSync("app/(pages)/page.tsx", "utf8")
    expect(page, "an ordinary user opening the site must land on the microphone").toMatch(
      /<IntakeClient\s*\/>/,
    )
  })

  it("sends ?judge=1 on the root to the autoplaying replay", async () => {
    const digest = await CallPage({ searchParams: Promise.resolve({ judge: "1" }) }).then(
      () => "",
      (error: { digest?: string }) => String(error.digest ?? ""),
    )
    expect(digest, "links in the README, the slides and lablab still carry ?judge=1").toContain(
      REPLAY_ENTRY_HREF,
    )
    expect(digest).toContain("308")
  })

  it("moves /live to the root and /start to the replay permanently", () => {
    expect(redirectTarget(() => LivePage())).toContain(`;${CALL_HREF};308`)
    expect(redirectTarget(() => StartPage())).toContain(`;${REPLAY_ENTRY_HREF};308`)
  })
})

describe("U1: the judge hub carries what the old home page carried", () => {
  it("offers the replay and the live call as real links that work before hydration", async () => {
    await renderDemo({})
    const watch = screen.getByRole("link", {
      name: new RegExp(`watch the ${REPLAY_SECONDS}-second case`, "i"),
    })
    expect(watch.getAttribute("href")).toBe(REPLAY_ENTRY_HREF)
    const talk = screen.getByRole("link", { name: /talk to it live/i })
    expect(talk.getAttribute("href")).toBe(CALL_HREF)
    expect(screen.getByText(/who pays/i)).toBeTruthy()
    expect(screen.getByText(/who gets the order/i)).toBeTruthy()
  })

  it("states the product claim that certainty is not proof", async () => {
    await renderDemo({})
    expect(screen.getByText(HERO_CLAIM)).toBeTruthy()
    expect(HERO_CLAIM).toMatch(/high confidence does not protect/i)
  })

  it("names the three things to say with outcomes computed by the shipped gate", async () => {
    await renderDemo({})
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

  it("puts the replay first in the section navigation, then the tour", async () => {
    await renderDemo({})
    const nav = screen.getByRole("navigation", { name: "On this page" })
    const targets = within(nav)
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    expect(targets.slice(0, 2)).toEqual(["#replay", "#tour"])
    for (const target of targets) {
      expect(document.querySelector(String(target)), `${target} has no section`).not.toBeNull()
    }
  })

  it("opens the instant entry inside the replay and lets it start itself under ?autoplay=1", async () => {
    await renderDemo({ autoplay: "1" })
    const replay = screen.getByRole("region", { name: "Replay" })
    expect(
      within(replay).getByRole("heading", { name: /already in the demonstration/i }),
    ).toBeTruthy()
    expect(
      within(replay).getByText(new RegExp(`${(DEMO_DURATION_MS / 1000).toFixed(1)}s /`)),
      "under reduced motion the autoplay settles on the decided state instead of animating",
    ).toBeTruthy()
  })

  it("treats ?judge=1 on the hub the same as ?autoplay=1", async () => {
    await renderDemo({ judge: "1" })
    expect(screen.getByRole("heading", { name: /already in the demonstration/i })).toBeTruthy()
  })

  it("carries the medical disclaimer", async () => {
    await renderDemo({})
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
      const candidates =
        path === "/"
          ? ["app/(pages)/page.tsx"]
          : [`app/(pages)${path}/page.tsx`, `app/(pages)/(docs)${path}/page.tsx`]
      expect(
        candidates.some((file) => existsSync(file)),
        `${step.id} points at ${path}`,
      ).toBe(true)
    }
  })

  it("never sends a judge through a route that only redirects", () => {
    for (const step of TOUR_STEPS) {
      expect(step.href, `${step.id} still points at a retired route`).not.toMatch(
        /^\/live|judge=1/,
      )
    }
  })
})
