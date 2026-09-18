import { render, screen } from "@testing-library/react"
import { renderToStaticMarkup } from "react-dom/server"
import { afterEach, describe, expect, it, vi } from "vitest"
import { readReducedMotion, useReducedMotion } from "@/shared/ui/motion/use-reduced-motion"

function stubMatchMedia(matches: boolean) {
  const listeners: Array<(event: MediaQueryListEvent) => void> = []
  const media = {
    matches,
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      listeners.push(listener)
    },
    removeEventListener: (_: string, listener: (event: MediaQueryListEvent) => void) => {
      const index = listeners.indexOf(listener)
      if (index !== -1) {
        listeners.splice(index, 1)
      }
    },
  } as unknown as MediaQueryList
  vi.stubGlobal("matchMedia", vi.fn().mockReturnValue(media))
  return { listeners, media }
}

function Probe() {
  const reduced = useReducedMotion()
  return <output data-testid="probe">{reduced ? "reduced" : "full"}</output>
}

describe("useReducedMotion first-render value", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("reads the real preference synchronously, not a hardcoded false, on the very first render", () => {
    stubMatchMedia(true)
    expect(
      readReducedMotion(),
      "readReducedMotion must answer the system preference before any effect runs",
    ).toBe(true)
  })

  it("returns false when the system has no reduced-motion preference", () => {
    stubMatchMedia(false)
    expect(readReducedMotion()).toBe(false)
  })

  it("never paints a false-negative first frame for a reduced-motion viewer", () => {
    stubMatchMedia(true)
    render(<Probe />)
    expect(
      screen.getByTestId("probe").textContent,
      "a component deciding motion off this hook's return value must not see 'full' even for one frame when the OS says reduce",
    ).toBe("reduced")
  })

  it("the state initializer itself carries the real preference, before any effect can run", () => {
    stubMatchMedia(true)
    const markup = renderToStaticMarkup(<Probe />)
    expect(
      markup,
      "renderToStaticMarkup never runs effects, so this is the literal useState initial value: a hardcoded false here would render 'full' for a reduced-motion viewer",
    ).toContain("reduced")
  })

  it("stays truthful when there is no window.matchMedia at all", () => {
    vi.stubGlobal("matchMedia", undefined)
    expect(readReducedMotion()).toBe(false)
  })
})
