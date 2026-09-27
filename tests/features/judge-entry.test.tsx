import { readFileSync } from "node:fs"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JUDGE_LINK_LABEL } from "@/features/intake/intake-screen/intake-prompt"
import { JudgeDemo } from "@/features/judge-demo"
import { DEMO_DURATION_MS } from "@/features/judge-demo/demo-arms"
import { REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import {
  INSTANT_ENTRY_BODY,
  INSTANT_ENTRY_CASE,
  InstantEntry,
} from "@/features/judge-demo/instant-entry"
import {
  REPLAY_FROM_MS,
  REPLAY_LENGTH_LABEL,
  sessionSeconds,
} from "@/features/judge-demo/replay-clock"
import {
  REPLAY_NOTICE_BODY,
  REPLAY_NOTICE_INSURANCE,
  REPLAY_NOTICE_TITLE,
  ReplayNotice,
} from "@/features/judge-demo/replay-notice"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"
import { JUDGE_ENTRY_REDIRECTS } from "../../next.config"

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

  it("is offered on the call page as a named judge entry rather than as a microphone fallback", () => {
    const screenSource = readFileSync(
      "src/features/intake/intake-screen/intake-prompt/index.tsx",
      "utf8",
    )
    expect(
      /No microphone\? Watch the recording/.test(screenSource),
      "framing the replay as what to do when the hardware fails buries the one path that always works",
    ).toBe(false)
    expect(screenSource).toContain("REPLAY_ENTRY_HREF")
    expect(
      JUDGE_LINK_LABEL,
      "A1-02: the link names the replay, and any length it states must be the replay's own",
    ).toMatch(new RegExp(`judging\\? watch the (${REPLAY_LENGTH_LABEL}|replay)`, "i"))
  })

  it("is the primary action on the judge hub", () => {
    const hero = readFileSync("src/features/judge-demo/judge-hero/index.tsx", "utf8")
    expect(
      hero,
      "the hero repeated the replay's own play control and the header's Call as two more buttons",
    ).not.toMatch(/ActionLink|REPLAY_ENTRY_HREF|CALL_HREF/)
    const demo = readFileSync("src/features/judge-demo/replay-controls/index.tsx", "utf8")
    expect(demo, "the play control on the replay is the primary button").toContain(
      '<Button tone="primary"',
    )
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
      screen.getByText(new RegExp(`${sessionSeconds(REPLAY_FROM_MS + 1000)} /`)),
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
      screen.getByText(new RegExp(`${sessionSeconds(REPLAY_FROM_MS)} /`)),
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

  it("renders the autoplaying replay on the judge hub, and every old judge link lands there", () => {
    expect(REPLAY_ENTRY_HREF).toBe("/demo?autoplay=1#replay")
    const demo = readFileSync("app/(pages)/demo/page.tsx", "utf8")
    expect(demo).toMatch(/<JudgeDemo\s[^>]*autoplay=\{autoplay\}/)
    expect(demo, "the autoplay flag has to be what switches the replay on").toMatch(
      /params\.autoplay === "1"/,
    )
    expect(demo, "old ?judge=1 links must still autoplay").toMatch(/params\.judge === "1"/)
    expect(demo, "an instant entry point that dead-ends is half an entry point").toContain(
      "InstantEntry",
    )
    expect(
      JUDGE_ENTRY_REDIRECTS.find((redirect) => redirect.source === "/")?.destination,
      "an old /?judge=1 link must still land on the replay",
    ).toBe(REPLAY_ENTRY_HREF)
    const start = readFileSync("app/(pages)/start/page.tsx", "utf8")
    expect(start, "an old /start link must still land on the replay").toContain(
      "permanentRedirect(REPLAY_ENTRY_HREF)",
    )
  })
})

describe("the instant entry is rendered by a page, not stranded in the tree", () => {
  it("offers the judge entry and the live call from the site header, so neither needs the URL", () => {
    const header = readFileSync("src/shared/ui/primitives/site-header/index.tsx", "utf8")
    expect(
      header,
      "a single URL a judge has to be told about is worse than a link they can see",
    ).toContain('href="/"')
    expect(header).toContain('href: "/"')
    expect(header).toContain('href: "/demo"')
  })
})
