import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { JudgeDemo } from "@/features/judge-demo"

const SUMMARY_TOPS = [420, 120]

beforeEach(() => {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    callback(0)
    return 0
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function summaryOf(): HTMLElement {
  const summary = screen.getByText("Show how this was decided").closest("summary")
  if (summary === null) {
    throw new Error("the replay lost its decision disclosure")
  }
  return summary
}

describe("opening the decision disclosure keeps its summary where it was clicked", () => {
  it("scrolls by the distance the summary moved when the layout changes on toggle", () => {
    const scrollBy = vi.fn()
    vi.stubGlobal("scrollBy", scrollBy)
    render(<JudgeDemo headingLevel="h2" />)
    const summary = summaryOf()
    const tops = [...SUMMARY_TOPS]
    vi.spyOn(summary, "getBoundingClientRect").mockImplementation(() => {
      const top = tops.shift() ?? 0
      return {
        top,
        bottom: top,
        left: 0,
        right: 0,
        width: 0,
        height: 0,
        x: 0,
        y: top,
      } as DOMRect
    })
    fireEvent.click(summary)
    expect(scrollBy).toHaveBeenCalledWith(0, -300)
  })

  it("does not scroll when the summary stays in place", () => {
    const scrollBy = vi.fn()
    vi.stubGlobal("scrollBy", scrollBy)
    render(<JudgeDemo headingLevel="h2" />)
    const summary = summaryOf()
    vi.spyOn(summary, "getBoundingClientRect").mockImplementation(
      () =>
        ({
          top: 420,
          bottom: 420,
          left: 0,
          right: 0,
          width: 0,
          height: 0,
          x: 0,
          y: 420,
        }) as DOMRect,
    )
    fireEvent.click(summary)
    expect(scrollBy).not.toHaveBeenCalled()
  })
})
