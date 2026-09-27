import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { Swap } from "@/shared/ui/motion/swap"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { Tabs } from "@/shared/ui/navigation/tabs"
import { COPY_RESET_MS, CopyButton } from "@/shared/ui/primitives/copy-button"
import { SiteHeader } from "@/shared/ui/primitives/site-header"

type FakeAnimation = {
  readonly target: Element
  readonly keyframes: Record<string, unknown>
  onfinish: (() => void) | null
  readonly cancel: () => void
  readonly addEventListener: (type: string, listener: () => void) => void
  readonly finish: () => void
}

const played: FakeAnimation[] = []

function fakeAnimate(this: Element, keyframes: Record<string, unknown>): FakeAnimation {
  const listeners: (() => void)[] = []
  const animation: FakeAnimation = {
    target: this,
    keyframes,
    onfinish: null,
    cancel: vi.fn(),
    addEventListener: (_type, listener) => listeners.push(listener),
    finish: () => {
      animation.onfinish?.()
      for (const listener of listeners) {
        listener()
      }
    },
  }
  played.push(animation)
  return animation
}

const TOKENS = {
  "--dur-instant": "70ms",
  "--dur-base": "180ms",
  "--dur-slow": "260ms",
  "--ease-out-quart": "cubic-bezier(0.25, 1, 0.5, 1)",
}

function withMotion() {
  for (const [name, value] of Object.entries(TOKENS)) {
    document.documentElement.style.setProperty(name, value)
  }
  Object.defineProperty(HTMLElement.prototype, "animate", {
    value: fakeAnimate,
    configurable: true,
    writable: true,
  })
  Object.defineProperty(HTMLElement.prototype, "getAnimations", {
    value: () => [],
    configurable: true,
    writable: true,
  })
}

afterEach(() => {
  played.length = 0
  vi.useRealTimers()
  document.documentElement.removeAttribute("style")
  Reflect.deleteProperty(HTMLElement.prototype, "animate")
  Reflect.deleteProperty(HTMLElement.prototype, "getAnimations")
})

describe("a disclosure animates both ways, and closes only when its closing motion ends", () => {
  beforeEach(withMotion)

  it("opens at once and grows the details from its folded height", () => {
    const { container } = render(<Disclosure summary="Claim">body</Disclosure>)
    const details = container.querySelector("details")
    fireEvent.click(screen.getByText("Claim"))
    expect(details?.open, "the content is in the tree from the first frame").toBe(true)
    const grow = played.find((animation) => animation.target === details)
    expect(grow?.keyframes).toHaveProperty("height")
  })

  it("keeps the content open while it folds, then closes the details", () => {
    const { container } = render(
      <Disclosure summary="Claim" defaultOpen>
        body
      </Disclosure>,
    )
    const details = container.querySelector("details")
    fireEvent.click(screen.getByText("Claim"))
    expect(
      details?.open,
      "closing natively is instant, so the details stays open while it folds",
    ).toBe(true)
    expect(details?.hasAttribute("data-closing")).toBe(true)
    const fold = played.find((animation) => animation.target === details)
    act(() => fold?.finish())
    expect(details?.open).toBe(false)
    expect(details?.hasAttribute("data-closing")).toBe(false)
  })

  it("leaves the native toggle alone where the browser has no animation API", () => {
    Reflect.deleteProperty(HTMLElement.prototype, "animate")
    const { container } = render(<Disclosure summary="Claim">body</Disclosure>)
    fireEvent.click(screen.getByText("Claim"))
    expect(played).toHaveLength(0)
    expect(container.querySelector("details")?.hasAttribute("data-closing")).toBe(false)
  })
})

describe("a swap lets the old content leave before the new one enters", () => {
  it("holds the outgoing content until its exit finishes", () => {
    withMotion()
    const { rerender } = render(<Swap swapKey="a">Listening</Swap>)
    rerender(<Swap swapKey="b">Connecting</Swap>)
    expect(screen.getByText("Listening")).toBeDefined()
    expect(screen.queryByText("Connecting")).toBeNull()
    act(() => played.at(-1)?.finish())
    expect(screen.queryByText("Listening")).toBeNull()
    expect(screen.getByText("Connecting")).toBeDefined()
  })

  it("lets a notice leave and then removes its box", () => {
    withMotion()
    const { container, rerender } = render(<Swap swapKey="on">Paused</Swap>)
    rerender(<Swap swapKey="off">{null}</Swap>)
    expect(screen.getByText("Paused")).toBeDefined()
    act(() => played.at(-1)?.finish())
    expect(container.innerHTML).toBe("")
  })

  it("swaps at once where the browser cannot animate", () => {
    const { rerender } = render(<Swap swapKey="a">Listening</Swap>)
    rerender(<Swap swapKey="b">Connecting</Swap>)
    expect(screen.getByText("Connecting")).toBeDefined()
  })
})

function layOutInRow() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (
    this: HTMLElement,
  ) {
    const keyed = this.hasAttribute("data-glide-key")
    const index = keyed ? [...(this.parentElement?.children ?? [])].indexOf(this) : 0
    return new DOMRect(keyed ? index * 100 : 0, 0, keyed ? 100 : 400, 44)
  })
}

function clearLayout() {
  vi.restoreAllMocks()
}

describe("a tab panel leaves before the next one enters", () => {
  it("fades the outgoing panel out, then shows the selected one without two panels at once", () => {
    withMotion()
    render(
      <Tabs
        label="Reasons"
        items={[
          { id: "one", label: "First", panel: "First panel" },
          { id: "two", label: "Second", panel: "Second panel" },
        ]}
      />,
    )
    const panelOf = (text: string) => screen.getByText(text).closest("[role=tabpanel]")
    fireEvent.click(screen.getByRole("tab", { name: "Second" }))
    expect(screen.getByRole("tab", { name: "Second" }).getAttribute("aria-selected")).toBe(
      "true",
    )
    expect(panelOf("First panel")?.hasAttribute("hidden")).toBe(false)
    expect(panelOf("Second panel")?.hasAttribute("hidden")).toBe(true)
    act(() => played.at(-1)?.finish())
    expect(panelOf("First panel")?.hasAttribute("hidden")).toBe(true)
    expect(panelOf("Second panel")?.hasAttribute("hidden")).toBe(false)
  })
})

describe("the selected marker glides instead of jumping", () => {
  afterEach(clearLayout)

  it("places the tab indicator under the selected tab and moves it on selection", () => {
    layOutInRow()
    render(
      <Tabs
        label="Reasons"
        items={[
          { id: "one", label: "First", panel: "1" },
          { id: "two", label: "Second", panel: "2" },
        ]}
      />,
    )
    const list = screen.getByRole("tablist")
    expect(list.hasAttribute("data-glide")).toBe(true)
    expect(list.style.getPropertyValue("--glide-left")).toBe("0px")
    fireEvent.click(screen.getByRole("tab", { name: "Second" }))
    expect(list.style.getPropertyValue("--glide-left")).toBe("100px")
  })

  it("starts the header pill from the section the reader came from", () => {
    layOutInRow()
    const first = render(<SiteHeader current="replay" />)
    first.unmount()
    const painted: string[] = []
    const setProperty = CSSStyleDeclaration.prototype.setProperty
    const spy = vi
      .spyOn(CSSStyleDeclaration.prototype, "setProperty")
      .mockImplementation(function (this: CSSStyleDeclaration, name, value, priority) {
        if (name === "--glide-left") {
          painted.push(String(value))
        }
        return setProperty.call(this, name, value, priority)
      })
    render(<SiteHeader current="docs" />)
    spy.mockRestore()
    expect(painted[0], "the pill is first painted where Replay was").toBe("100px")
    expect(painted.at(-1), "and then moved to Docs, so it glides across").toBe("200px")
  })
})

describe("the copy confirmation fades out instead of vanishing", () => {
  it("keeps the last message on the visual note while it fades, and empties the status", async () => {
    vi.useFakeTimers()
    Object.defineProperty(globalThis.navigator, "clipboard", {
      value: { writeText: async () => undefined },
      configurable: true,
    })
    const { container } = render(<CopyButton value="make verify" label="Copy command" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    act(() => {
      vi.advanceTimersByTime(COPY_RESET_MS)
    })
    const note = container.querySelector("[aria-hidden=true][data-state]")
    expect(note?.getAttribute("data-state")).toBe("idle")
    expect(note?.textContent).toBe("Copied")
    expect(screen.getByRole("status").textContent).toBe("")
    Reflect.deleteProperty(globalThis.navigator, "clipboard")
  })
})
