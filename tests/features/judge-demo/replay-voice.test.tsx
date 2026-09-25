import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JudgeDemo } from "@/features/judge-demo"
import { DECISION_AT_MS } from "@/features/judge-demo/demo-arms"
import { REPLAY_LINES } from "@/features/judge-demo/replay-voice/replay-script"

const spoken: string[] = []

class FakeUtterance {
  rate = 1
  pitch = 1
  constructor(readonly text: string) {}
}

beforeEach(() => {
  spoken.length = 0
  vi.useFakeTimers()
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance)
  vi.stubGlobal("speechSynthesis", {
    speak: (utterance: FakeUtterance) => spoken.push(utterance.text),
    cancel: () => undefined,
  })
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

function readingBack(): string | null {
  const wrapper = document.querySelector("[data-reading-back]")
  return wrapper?.getAttribute("data-reading-back") ?? null
}

describe("U2: the replay speaks, and its captions and highlight follow the playback clock", () => {
  it("speaks each line when the clock reaches it, not before", () => {
    render(<JudgeDemo />)
    fireEvent.click(screen.getByRole("button", { name: /play the replay/i }))
    advance(6000)
    expect(spoken).toEqual([])
    advance(1000)
    expect(spoken).toEqual([REPLAY_LINES[0]?.text])
    advance(DECISION_AT_MS - 7000)
    expect(spoken[1], "the agent's line is the gate's own re-ask").toBe(REPLAY_LINES[1]?.text)
  })

  it("highlights the field only while the agent reads it back", () => {
    render(<JudgeDemo />)
    fireEvent.click(screen.getByRole("button", { name: /play the replay/i }))
    advance(7000)
    expect(readingBack()).toBe("false")
    advance(DECISION_AT_MS - 7000 + 200)
    expect(readingBack()).toBe("true")
    const caption = screen.getByText(/voices are synthesised by this browser/i).parentElement
    expect(caption?.textContent, "the caption on screen is the line the clock is on").toContain(
      REPLAY_LINES[1]?.text,
    )
    advance(16500 - DECISION_AT_MS - 200)
    expect(readingBack()).toBe("false")
  })

  it("says the voices are synthesised, never that they were recorded", () => {
    render(<JudgeDemo />)
    fireEvent.click(screen.getByRole("button", { name: /play the replay/i }))
    expect(screen.getByText(/voices are synthesised by this browser/i)).toBeTruthy()
    expect(screen.queryByText(/recorded session replayed/i)).toBeNull()
  })

  it("admits a silent browser rather than pretending to speak", () => {
    vi.stubGlobal("speechSynthesis", undefined)
    render(<JudgeDemo />)
    fireEvent.click(screen.getByRole("button", { name: /play the replay/i }))
    expect(screen.getByText(/cannot synthesise speech/i)).toBeTruthy()
  })
})
