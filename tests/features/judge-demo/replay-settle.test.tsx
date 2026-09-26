import { act, cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConfirmationReason, ReasonCode } from "@/domain"
import { CONFIRMED_HEADLINE } from "@/features/gate-banner"
import { JudgeDemo } from "@/features/judge-demo"
import { SETTLED_AT_MS } from "@/features/judge-demo/demo-arms"
import { PairRuleCatch } from "@/features/judge-demo/pair-rule-catch"
import {
  DEMO_DURATION_MS,
  REPLAY_FROM_MS,
  REPLAY_LENGTH_LABEL,
  REPLAY_LENGTH_MS,
  REPLAY_SECONDS,
  replaySeconds,
} from "@/features/judge-demo/replay-clock"
import { AB_GATE_SCRIPT, abCatch } from "@/features/metrics/report-figures"

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

describe("r2-A3 A3R2-02: the gate banner agrees with what entered the order", () => {
  it("drives the banner from the spoken-name confirmation once the replay settles", () => {
    render(<JudgeDemo />)
    playTo(SETTLED_AT_MS + 100)
    const headline = screen.getByText(CONFIRMED_HEADLINE)
    const banner = headline.closest("div")?.parentElement as HTMLElement
    expect(within(banner).getByText(ConfirmationReason.CallerNamedValue)).toBeTruthy()
    expect(
      within(banner).getByText(ReasonCode.LasaHit),
      "the re-ask stays as one line of history, not as the current verdict",
    ).toBeTruthy()
    expect(screen.queryByText(/the field stays empty until the caller says/i)).toBeNull()
  })

  it("still shows the re-ask while the question is open", () => {
    render(<JudgeDemo />)
    playTo(SETTLED_AT_MS - 500)
    expect(screen.queryByText(CONFIRMED_HEADLINE)).toBeNull()
    expect(screen.getAllByText(ReasonCode.LasaHit).length).toBeGreaterThan(0)
  })
})

describe("r2-A2 N6: one announcement per decision on the replay", () => {
  it("keeps the verdict strip as the only live region", () => {
    const { container } = render(<JudgeDemo />)
    playTo(SETTLED_AT_MS + 100)
    const live = container.querySelectorAll("[aria-live]:not([aria-live='off'])")
    expect([...live].map((node) => node.getAttribute("aria-label"))).toEqual([
      "What each arm does with the same words",
    ])
  })
})

describe("r2-A1 A1r2-04: the replay's title and clock state the same length", () => {
  it("derives the label and the clock from one constant", () => {
    expect(REPLAY_LENGTH_LABEL).toBe(`${REPLAY_SECONDS}-second replay`)
    expect(Math.round(Number.parseFloat(replaySeconds(REPLAY_LENGTH_MS)))).toBe(REPLAY_SECONDS)
    render(<JudgeDemo />)
    playTo(DEMO_DURATION_MS + 100)
    expect(
      screen.getByText(
        `Replay ${replaySeconds(REPLAY_LENGTH_MS)} of ${replaySeconds(REPLAY_LENGTH_MS)}`,
      ),
    ).toBeTruthy()
    expect(screen.getByText(/session clock 18\.6s \/ 18\.6s/)).toBeTruthy()
  })
})

describe("r2-A5 A5-01: the replay carries the measured catch, with its command and n", () => {
  it("renders the pair-rule figures from the benchmark rows", () => {
    const ab = abCatch()
    expect(ab).not.toBeNull()
    if (ab === null) {
      return
    }
    render(<PairRuleCatch without={ab.without} shipped={ab.with} />)
    const block = screen.getByRole("complementary", { name: /what the pair rule catches/i })
    expect(within(block).getByText(ab.without.value ?? "")).toBeTruthy()
    expect(within(block).getByText(ab.with.value ?? "")).toBeTruthy()
    expect(within(block).getByText(AB_GATE_SCRIPT)).toBeTruthy()
    expect(block.textContent).toContain(`n = ${ab.with.n}`)
    expect(ab.without.value).toBe("20/20")
    expect(ab.with.value).toBe("0/20")
  })
})
