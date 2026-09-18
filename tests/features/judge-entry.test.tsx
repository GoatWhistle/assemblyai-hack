import { readFileSync } from "node:fs"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JudgeDemo } from "@/features/judge-demo"
import { DEMO_DURATION_MS } from "@/features/judge-demo/demo-arms"
import {
  INSTANT_ENTRY_BODY,
  INSTANT_ENTRY_CASE,
  InstantEntry,
} from "@/features/judge-demo/instant-entry"
import {
  REPLAY_NOTICE_BODY,
  REPLAY_NOTICE_INSURANCE,
  REPLAY_NOTICE_TITLE,
  ReplayNotice,
} from "@/features/judge-demo/replay-notice"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"

function matchMediaReturning(reduced: boolean) {
  return (query: string) =>
    ({
      matches: query === REDUCED_MOTION_QUERY ? reduced : false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }) as unknown as MediaQueryList
}

beforeEach(() => {
  vi.stubGlobal("matchMedia", matchMediaReturning(false))
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the replay is a first-class entry point that never reads as live", () => {
  it("names itself a simulated session rather than a call", () => {
    render(<ReplayNotice />)
    expect(
      screen.getByText(REPLAY_NOTICE_TITLE),
      "a recording presented as a live call is the one thing a replay must never do",
    ).toBeTruthy()
  })

  it("says plainly that no microphone is open and no audio is being sent", () => {
    render(<ReplayNotice />)
    expect(REPLAY_NOTICE_BODY).toMatch(/no microphone is open/i)
    expect(
      REPLAY_NOTICE_BODY,
      "a judge has to be able to tell from the page alone that nothing is being billed right now",
    ).toMatch(/no audio is being sent/i)
  })

  it("states that the gate deciding here is the shipped one", () => {
    expect(
      REPLAY_NOTICE_BODY,
      "a replay whose decisions were staged proves nothing; the claim has to be on the page",
    ).toMatch(/shipped ones/i)
  })

  it("says out loud that the replay is the demonstration's insurance", () => {
    expect(
      REPLAY_NOTICE_INSURANCE,
      "twelve of forty-five submissions lost points on a demo that would not run; the reason this path exists belongs on the page, not in a source comment",
    ).toMatch(/cannot fail/i)
  })

  it("rides along on the replay itself rather than living on a separate page", () => {
    render(<JudgeDemo />)
    expect(
      screen.getByText(REPLAY_NOTICE_TITLE),
      "a label a judge has to navigate to is a label that is not read",
    ).toBeTruthy()
  })

  it("is offered as a primary action on the intake screen rather than as a microphone fallback", () => {
    const screenSource = readFileSync("src/features/intake/intake-screen/index.tsx", "utf8")
    expect(
      /No microphone\? Watch the recording/.test(screenSource),
      "framing the replay as what to do when the hardware fails buries the one path that always works",
    ).toBe(false)
    expect(screenSource).toContain("Run the recorded session")
    expect(screenSource).toContain('tone="primary"')
  })
})

describe("one URL lands a judge in the state worth seeing", () => {
  it("starts the replay without a click", () => {
    vi.useFakeTimers()
    render(<JudgeDemo autoplay />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.getByText(/1\.0s \//),
      "a judge who has to find and press play is a judge who may not; the URL is the instruction",
    ).toBeTruthy()
  })

  it("does not autoplay when nothing asked it to", () => {
    vi.useFakeTimers()
    render(<JudgeDemo />)
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(
      screen.getByText(/0\.0s \//),
      "the ordinary demonstration page must stay under the reader's control",
    ).toBeTruthy()
  })

  it("settles straight to the decided state under reduced motion instead of animating", () => {
    vi.stubGlobal("matchMedia", matchMediaReturning(true))
    vi.useFakeTimers()
    render(<JudgeDemo autoplay />)
    act(() => {
      vi.advanceTimersByTime(200)
    })
    expect(
      screen.getByText(new RegExp(`${(DEMO_DURATION_MS / 1000).toFixed(1)}s /`)),
      "a viewer who asked for less motion still has to reach the outcome; skipping the animation must not skip the result",
    ).toBeTruthy()
  })

  it("promises no configuration, no account and no microphone", () => {
    render(<InstantEntry />)
    expect(INSTANT_ENTRY_BODY).toMatch(/no account/i)
    expect(INSTANT_ENTRY_BODY).toMatch(/no microphone/i)
    expect(
      INSTANT_ENTRY_BODY,
      "the equivalent of a demo login is a page that needs nothing entered at all",
    ).toMatch(/nothing to install/i)
  })

  it("says which case the judge has landed on rather than leaving it to be inferred", () => {
    expect(
      INSTANT_ENTRY_CASE,
      "landing on the right screen is worthless if the judge cannot tell what they are looking at",
    ).toMatch(/highest certainty/i)
  })

  it("has a page at /start that renders the autoplaying replay", () => {
    const page = readFileSync("app/(pages)/start/page.tsx", "utf8")
    expect(page).toMatch(/<JudgeDemo\s[^>]*\bautoplay\b/)
    expect(page, "an instant entry point that dead-ends is half an entry point").toContain(
      "InstantEntry",
    )
  })
})

describe("the instant entry is rendered by a page, not stranded in the tree", () => {
  it("offers the instant entry from the site header, so it is findable without the URL", () => {
    const header = readFileSync("src/shared/ui/primitives/site-header/index.tsx", "utf8")
    expect(
      header,
      "a single URL a judge has to be told about is worse than a link they can see",
    ).toContain('href: "/start"')
  })
})
