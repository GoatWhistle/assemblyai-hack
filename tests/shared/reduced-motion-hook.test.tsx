import { act, render, screen } from "@testing-library/react"
import { hydrateRoot } from "react-dom/client"
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

  it("renders the server markup without the preference, so hydration never disagrees with it", () => {
    stubMatchMedia(true)
    const markup = renderToStaticMarkup(<Probe />)
    expect(
      markup,
      "the server cannot see the viewer's preference; reading matchMedia during the first client render produced a hydration mismatch on the call page (r1-A2 F3), and CSS media queries already cover the first paint",
    ).toContain("full")
  })

  it("hydrates a reduced-motion viewer without a mismatch warning and then reports the preference", async () => {
    stubMatchMedia(true)
    const container = document.createElement("div")
    container.innerHTML = renderToStaticMarkup(<Probe />)
    document.body.append(container)
    const errors = vi.spyOn(console, "error").mockImplementation(() => undefined)
    await act(async () => {
      hydrateRoot(container, <Probe />)
    })
    expect(
      errors.mock.calls.flat().join(" "),
      "a hydration warning means server and client rendered different trees for the same component",
    ).not.toMatch(/hydrat|did not match|didn't match/i)
    errors.mockRestore()
    expect(container.textContent).toBe("reduced")
    container.remove()
  })

  it("follows a preference that changes while the page is open", () => {
    const { listeners, media } = stubMatchMedia(false)
    render(<Probe />)
    expect(screen.getByTestId("probe").textContent).toBe("full")
    act(() => {
      ;(media as { matches: boolean }).matches = true
      for (const listener of [...listeners]) {
        listener({ matches: true } as MediaQueryListEvent)
      }
    })
    expect(screen.getByTestId("probe").textContent).toBe("reduced")
  })

  it("stays truthful when there is no window.matchMedia at all", () => {
    vi.stubGlobal("matchMedia", undefined)
    expect(readReducedMotion()).toBe(false)
  })
})
