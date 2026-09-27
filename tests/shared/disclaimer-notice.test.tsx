import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { DisclaimerNotice, NOTICE_LABEL } from "@/shared/ui/states/disclaimer"
import { placeNotice } from "@/shared/ui/states/disclaimer/place-notice"
import { CLOSE_GRACE_MS, OPEN_DELAY_MS } from "@/shared/ui/states/disclaimer/use-notice"

class PointerEventShim extends MouseEvent {
  readonly pointerType: string
  constructor(type: string, init: PointerEventInit = {}) {
    super(type, init)
    this.pointerType = init.pointerType ?? ""
  }
}

beforeAll(() => {
  if (typeof window.PointerEvent === "undefined") {
    Object.defineProperty(window, "PointerEvent", { value: PointerEventShim })
  }
})

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function setup() {
  render(<DisclaimerNotice />)
  const mark = screen.getByRole("button", { name: NOTICE_LABEL })
  const sheetId = mark.getAttribute("aria-controls") ?? ""
  const sheet = document.getElementById(sheetId)
  if (sheet === null) {
    throw new Error("the mark controls no sheet")
  }
  return { mark, sheet }
}

function isOpen(mark: HTMLElement, sheet: HTMLElement): boolean {
  const expanded = mark.getAttribute("aria-expanded") === "true"
  expect(sheet.hasAttribute("data-open"), "the sheet and the mark agree").toBe(expanded)
  return expanded
}

function wait(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms)
  })
}

describe("the disclaimer mark", () => {
  it("is a real button with a spoken name that says what it is", () => {
    const { mark, sheet } = setup()
    expect(mark.tagName).toBe("BUTTON")
    expect(mark.getAttribute("type")).toBe("button")
    expect(sheet.getAttribute("popover")).toBe("manual")
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("opens on hover after a short intent delay, not on a pass-through", () => {
    const { mark, sheet } = setup()
    fireEvent.pointerEnter(mark, { pointerType: "mouse" })
    wait(OPEN_DELAY_MS - 20)
    expect(isOpen(mark, sheet), "a pointer crossing the header does not flash it").toBe(false)
    wait(40)
    expect(isOpen(mark, sheet)).toBe(true)
  })

  it("stays open while the pointer travels into the sheet and closes after the grace", () => {
    const { mark, sheet } = setup()
    fireEvent.pointerEnter(mark, { pointerType: "mouse" })
    wait(OPEN_DELAY_MS)
    fireEvent.pointerLeave(mark, { pointerType: "mouse" })
    wait(CLOSE_GRACE_MS / 2)
    fireEvent.pointerEnter(sheet, { pointerType: "mouse" })
    wait(CLOSE_GRACE_MS * 2)
    expect(isOpen(mark, sheet), "reading the sheet keeps it open").toBe(true)
    fireEvent.pointerLeave(sheet, { pointerType: "mouse" })
    wait(CLOSE_GRACE_MS - 20)
    expect(isOpen(mark, sheet)).toBe(true)
    wait(40)
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("does not treat a finger as a hover", () => {
    const { mark, sheet } = setup()
    fireEvent.pointerEnter(mark, { pointerType: "touch" })
    wait(OPEN_DELAY_MS * 3)
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("opens on keyboard focus and closes when focus leaves", () => {
    const { mark, sheet } = setup()
    act(() => {
      mark.focus()
    })
    expect(isOpen(mark, sheet)).toBe(true)
    act(() => {
      mark.blur()
    })
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("toggles on tap, without the focus that comes with a press opening it first", () => {
    const { mark, sheet } = setup()
    fireEvent.pointerDown(mark, { pointerType: "touch" })
    act(() => {
      mark.focus()
    })
    expect(isOpen(mark, sheet), "a press is not keyboard focus").toBe(false)
    fireEvent.click(mark)
    expect(isOpen(mark, sheet)).toBe(true)
    fireEvent.pointerDown(mark, { pointerType: "touch" })
    fireEvent.click(mark)
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("pins a hover-opened sheet on click instead of closing it under the pointer", () => {
    const { mark, sheet } = setup()
    fireEvent.pointerEnter(mark, { pointerType: "mouse" })
    wait(OPEN_DELAY_MS)
    fireEvent.pointerDown(mark, { pointerType: "mouse" })
    fireEvent.click(mark)
    expect(isOpen(mark, sheet)).toBe(true)
    fireEvent.pointerLeave(mark, { pointerType: "mouse" })
    wait(CLOSE_GRACE_MS * 2)
    expect(isOpen(mark, sheet), "a pinned sheet waits for Escape or an outside press").toBe(
      true,
    )
  })

  it("closes on Escape", () => {
    const { mark, sheet } = setup()
    fireEvent.click(mark)
    expect(isOpen(mark, sheet)).toBe(true)
    fireEvent.keyDown(document, { key: "Escape" })
    expect(isOpen(mark, sheet)).toBe(false)
  })

  it("closes on a press outside and ignores a press inside", () => {
    const { mark, sheet } = setup()
    fireEvent.click(mark)
    fireEvent.pointerDown(sheet, { pointerType: "mouse" })
    expect(isOpen(mark, sheet)).toBe(true)
    fireEvent.pointerDown(document.body, { pointerType: "mouse" })
    expect(isOpen(mark, sheet)).toBe(false)
  })
})

describe("where the sheet lands", () => {
  const anchor = { left: 200, top: 20, right: 244, bottom: 64 }
  const bounds = { left: 16, top: 0, right: 1424, bottom: 80 }

  it("drops the title glyph under the mark on a wide screen", () => {
    const placed = placeNotice({
      anchor,
      bounds,
      sheetWidth: 416,
      viewportHeight: 900,
      compact: false,
    })
    expect(placed.width).toBeNull()
    expect(placed.top).toBeGreaterThan(anchor.bottom)
    expect(placed.left + placed.originX).toBe(222)
  })

  it("never runs past the column on either side", () => {
    const right = placeNotice({
      anchor: { left: 1400, top: 20, right: 1444, bottom: 64 },
      bounds: { left: 16, top: 0, right: 1440, bottom: 80 },
      sheetWidth: 416,
      viewportHeight: 900,
      compact: false,
    })
    expect(right.left + 416).toBeLessThanOrEqual(1440)
    const left = placeNotice({
      anchor: { left: 0, top: 20, right: 20, bottom: 64 },
      bounds,
      sheetWidth: 416,
      viewportHeight: 900,
      compact: false,
    })
    expect(left.left).toBe(bounds.left)
  })

  it("becomes a full-width sheet under the header on a phone", () => {
    const placed = placeNotice({
      anchor: { left: 120, top: 8, right: 164, bottom: 52 },
      bounds: { left: 16, top: 0, right: 344, bottom: 60 },
      sheetWidth: 416,
      viewportHeight: 640,
      compact: true,
    })
    expect(placed.left).toBe(16)
    expect(placed.width).toBe(328)
    expect(placed.maxHeight).toBeLessThan(640 - placed.top)
  })
})
