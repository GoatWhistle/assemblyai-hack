import { act, cleanup, render, screen } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JudgeDemo } from "@/features/judge-demo"
import { REPLAY_NOTICE_TITLE, REPLAY_TAG_LINE } from "@/features/judge-demo/replay-notice"

function precedes(first: Element, second: Element): boolean {
  return (first.compareDocumentPosition(second) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("AU4: the judge URL puts the signature moment before the explanation", () => {
  it("renders both arms before the long replay notice when it autoplays", () => {
    render(<JudgeDemo autoplay headingLevel="h2" />)
    const gated = screen.getByRole("region", { name: "Pair rule on" })
    const notice = screen.getByRole("complementary", { name: REPLAY_NOTICE_TITLE })
    expect(
      precedes(gated, notice),
      "on /demo?autoplay=1 the decision lands at 9.6 s; a judge who has to scroll past three paragraphs to find it misses it",
    ).toBe(true)
  })

  it("still labels the replay as synthesised above the arms, before any verdict is shown", () => {
    render(<JudgeDemo autoplay headingLevel="h2" />)
    const tag = screen.getByText(REPLAY_TAG_LINE)
    const gated = screen.getByRole("region", { name: "Pair rule on" })
    expect(precedes(tag, gated)).toBe(true)
    expect(REPLAY_TAG_LINE).toMatch(/synthesised/i)
    expect(REPLAY_TAG_LINE).toMatch(/no microphone is open/i)
  })

  it("keeps the explanation first when nothing autoplays", () => {
    render(<JudgeDemo headingLevel="h2" />)
    const gated = screen.getByRole("region", { name: "Pair rule on" })
    const notice = screen.getByRole("complementary", { name: REPLAY_NOTICE_TITLE })
    expect(precedes(notice, gated)).toBe(true)
  })

  it("nests the arm titles under the demonstration heading", () => {
    render(<JudgeDemo autoplay headingLevel="h2" />)
    expect(screen.getByRole("heading", { level: 3, name: /Pair rule on/ })).toBeTruthy()
  })
})

describe("AU5: the autoplay survives an effect that runs twice", () => {
  it("keeps ticking under StrictMode, as after a client-side jump from the hero to ?judge=1", () => {
    vi.useFakeTimers()
    render(
      <StrictMode>
        <JudgeDemo autoplay headingLevel="h2" />
      </StrictMode>,
    )
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.getByText(/1\.0s \//),
      "a cleanup that stops the timer while a ref still says it started leaves the replay frozen at 0.0s with Play disabled",
    ).toBeTruthy()
  })
})

describe("AU5: pressing a replay control never drops keyboard focus on the page body", () => {
  it("moves focus to Stop when Play disables itself, and back to Play when Stop does", () => {
    vi.useFakeTimers()
    render(<JudgeDemo headingLevel="h2" />)
    const play = screen.getByRole("button", { name: /play the replay/i })
    play.focus()
    act(() => {
      play.click()
    })
    const stop = screen.getByRole("button", { name: /^stop$/i })
    expect(
      document.activeElement,
      "a disabled button that held focus hands it to nothing",
    ).toBe(stop)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    act(() => {
      stop.click()
    })
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /play again/i }))
  })

  it("returns focus to Play when the replay ends on its own while Stop holds it", () => {
    vi.useFakeTimers()
    render(<JudgeDemo headingLevel="h2" />)
    const play = screen.getByRole("button", { name: /play the replay/i })
    play.focus()
    act(() => {
      play.click()
    })
    act(() => {
      vi.advanceTimersByTime(20000)
    })
    expect(document.activeElement).toBe(screen.getByRole("button", { name: /play again/i }))
  })

  it("does not steal focus when the replay starts without the controls being focused", () => {
    vi.useFakeTimers()
    render(<JudgeDemo autoplay headingLevel="h2" />)
    act(() => {
      vi.advanceTimersByTime(20000)
    })
    expect(document.activeElement).toBe(document.body)
  })
})
