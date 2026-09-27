import { existsSync, readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { STANCE_LABEL } from "@/features/field-card/field-status"
import { JudgeDemo } from "@/features/judge-demo"
import { DEMO_ARMS, SETTLED_AT_MS, SPOKEN_TRUTH } from "@/features/judge-demo/demo-arms"
import { DECISION_AT_MS, REPLAY_FROM_MS } from "@/features/judge-demo/replay-clock"
import { VERDICT_STRIP_LABEL } from "@/features/judge-demo/verdict-strip"
import { STRIP_ARMS } from "@/features/judge-demo/verdict-strip/strip-lines"
import {
  PUBLISHED_RECORDING_FILE,
  RECORDING_PUBLISHED,
} from "@/features/recorded-replay/published"

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function playTo(sessionMs: number) {
  act(() => {
    screen.getByRole("button", { name: /play the replay/i }).click()
  })
  act(() => {
    vi.advanceTimersByTime(sessionMs - REPLAY_FROM_MS)
  })
}

function card() {
  return screen.getByRole("article", { name: /drug name field card/i })
}

function visibleVerdicts(): string[] {
  const strip = screen.getByRole("region", { name: VERDICT_STRIP_LABEL })
  return [...strip.querySelectorAll("p:not([aria-hidden])")].map(
    (node) => node.textContent ?? "",
  )
}

describe("A1-01: both verdicts sit in one strip directly under the replay controls", () => {
  it("renders the strip before the two arms, so the outcome is read without scrolling", () => {
    render(<JudgeDemo autoplay headingLevel="h2" />)
    const strip = screen.getByRole("region", { name: VERDICT_STRIP_LABEL })
    const arm = screen.getByRole("region", { name: "Pair rule on" })
    expect(strip.compareDocumentPosition(arm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("names what each arm wrote once the replay settles", () => {
    render(<JudgeDemo />)
    playTo(SETTLED_AT_MS + 100)
    const texts = visibleVerdicts().join(" | ")
    for (const arm of DEMO_ARMS) {
      expect(texts).toContain(String(arm.written?.value))
    }
    expect(STRIP_ARMS.map((arm) => arm.lines.settled.tone)).toEqual(["committed", "refused"])
  })

  it("stays neutral until the gate decides, then shows the re-ask at 1.00", () => {
    render(<JudgeDemo />)
    const strip = screen.getByRole("region", { name: VERDICT_STRIP_LABEL })
    const tones = () =>
      [...strip.querySelectorAll(":scope > [data-tone]")].map((node) =>
        node.getAttribute("data-tone"),
      )
    expect(tones()).toEqual(["undecided", "undecided"])
    playTo(DECISION_AT_MS + 100)
    expect(tones()).toEqual(["lasa", "threshold"])
    expect(visibleVerdicts().join(" ")).toContain("RE-ASK at certainty 1.00")
  })
})

describe("A3-05: nothing claims a decision before the gate decides", () => {
  it("shows the card as undecided, with the certainty already outranked by the pair", () => {
    render(<JudgeDemo />)
    const drug = card()
    expect(within(drug).getByText(STANCE_LABEL.proposed)).toBeTruthy()
    expect(within(drug).queryByText(STANCE_LABEL.asking)).toBeNull()
    expect(within(drug).queryByText(STANCE_LABEL.lasa)).toBeNull()
    expect(within(drug).getByText(/will not decide it/i)).toBeTruthy()
  })
})

describe("the replay reads in one screen: the field card's proof waits behind one disclosure", () => {
  it("keeps the card in the page, folded under a summary that says what opening it shows", () => {
    render(<JudgeDemo />)
    const folded = card().closest("details")
    expect(folded, "the card sits inside a disclosure, not beside the arms").not.toBeNull()
    expect(folded?.open, "folded by default so the two arms stay the first thing read").toBe(
      false,
    )
    expect(within(folded as HTMLElement).getByText("Show how this was decided")).toBeTruthy()
  })
})

describe("A3-06: the settled card agrees with what entered the order", () => {
  it("shows the spoken drug as the value, corrected from the misheard one and confirmed aloud", () => {
    render(<JudgeDemo />)
    playTo(SETTLED_AT_MS + 100)
    const drug = card()
    expect(within(drug).getAllByText(SPOKEN_TRUTH).length).toBeGreaterThan(0)
    expect(within(drug).getByText(STANCE_LABEL.confirmed)).toBeTruthy()
    expect(within(drug).queryByText(STANCE_LABEL.lasa)).toBeNull()
    expect(within(drug).getByText(/correcting attempt 1/i)).toBeTruthy()
    expect(within(drug).getByText("the value was corrected")).toBeTruthy()
  })
})

const DEMO_ANCHOR = /(?:\/demo|REPLAY_HUB_HREF\})(?:\?[^"'`#\s]*)?#([a-z][a-z-]*)/g

async function demoAnchors(): Promise<ReadonlyMap<string, string>> {
  const found = new Map<string, string>()
  for (const pattern of ["app/**/*.{ts,tsx}", "src/**/*.{ts,tsx}"]) {
    for await (const file of glob(pattern)) {
      for (const match of readFileSync(file, "utf8").matchAll(DEMO_ANCHOR)) {
        found.set(match[1] ?? "", file.replaceAll("\\", "/"))
      }
    }
  }
  return found
}

describe("A2-F6: every link into /demo#section still lands on a section of /demo", () => {
  it("keeps each anchor as the replay or as a hash-linked tab of the page", async () => {
    const page = readFileSync("app/(pages)/demo/page.tsx", "utf8")
    expect(
      page,
      "the tabs must answer to the hash or the links into them open the wrong panel",
    ).toMatch(/<Tabs[^>]* anchored/)
    const anchors = await demoAnchors()
    expect(anchors.size, "no link into a /demo section was found").toBeGreaterThan(0)
    for (const [id, file] of anchors) {
      const constant = page.match(new RegExp(`const ([A-Z]+_ID) = "${id}"`))?.[1]
      expect(
        constant,
        `${file} links /demo#${id}, which names no section on the page`,
      ).toBeDefined()
      expect(page).toMatch(new RegExp(`id(: |=[{])${constant}[,}]`))
    }
  })
})

describe("A2-F14: the recorded-audio section does not probe for a file that is not there", () => {
  it("keeps the published flag equal to the presence of the file", () => {
    expect(RECORDING_PUBLISHED).toBe(existsSync(PUBLISHED_RECORDING_FILE))
  })

  it("passes the flag from the page instead of fetching on every load", () => {
    const page = readFileSync("app/(pages)/demo/page.tsx", "utf8")
    expect(page).toContain("<RecordedSection published={RECORDING_PUBLISHED} />")
  })
})
