import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { KeytermsAb } from "@/features/judge-demo/keyterms-ab"
import { isTabArrowKey, nextTabIndex } from "@/features/judge-demo/keyterms-ab/arms"

describe("the roving-tabindex math a real ARIA tablist needs", () => {
  it("moves right and wraps past the last tab", () => {
    expect(nextTabIndex(0, "ArrowRight", 2)).toBe(1)
    expect(
      nextTabIndex(1, "ArrowRight", 2),
      "a screen-reader user expects ArrowRight on the last tab to cycle back to the first, not to do nothing",
    ).toBe(0)
  })

  it("moves left and wraps past the first tab", () => {
    expect(nextTabIndex(1, "ArrowLeft", 2)).toBe(0)
    expect(nextTabIndex(0, "ArrowLeft", 2)).toBe(1)
  })

  it("Home and End jump to the first and last tab regardless of current position", () => {
    expect(nextTabIndex(1, "Home", 2)).toBe(0)
    expect(nextTabIndex(0, "End", 2)).toBe(1)
  })

  it("refuses to compute a next index for an empty tablist", () => {
    expect(() => nextTabIndex(0, "ArrowRight", 0)).toThrow(RangeError)
  })

  it("recognises exactly the four tab-navigation keys and nothing else", () => {
    for (const key of ["ArrowLeft", "ArrowRight", "Home", "End"]) {
      expect(isTabArrowKey(key)).toBe(true)
    }
    for (const key of ["Enter", " ", "Tab", "ArrowUp", "ArrowDown"]) {
      expect(
        isTabArrowKey(key),
        `${key} must fall through to default browser behaviour, not be swallowed by the tablist`,
      ).toBe(false)
    }
  })
})

describe("the keyterms A/B tablist implements the full pattern rather than a partial one", () => {
  it("gives only the active tab a tabIndex of 0, so Tab reaches the switcher once", () => {
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    const zeroIndexed = tabs.filter((tab) => tab.getAttribute("tabindex") === "0")
    expect(
      zeroIndexed,
      "a roving tablist keeps exactly one tab in the Tab order; two tabbable tabs means Tab has to pass through the whole group",
    ).toHaveLength(1)
    expect(zeroIndexed[0]?.getAttribute("aria-selected")).toBe("true")
  })

  it("moves selection and focus to the second tab on ArrowRight", async () => {
    const user = userEvent.setup()
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    tabs[0]?.focus()
    await user.keyboard("{ArrowRight}")
    expect(
      document.activeElement,
      "a tablist that declares role=tab but ignores ArrowRight tells a screen-reader user to expect a keystroke that does nothing, which is worse than no tab role at all",
    ).toBe(tabs[1])
    expect(tabs[1]?.getAttribute("aria-selected")).toBe("true")
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("false")
  })

  it("wraps from the last tab back to the first on ArrowRight", async () => {
    const user = userEvent.setup()
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    tabs[1]?.focus()
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(tabs[0])
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true")
  })

  it("moves back to the first tab on ArrowLeft from the second", async () => {
    const user = userEvent.setup()
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    tabs[1]?.focus()
    await user.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(tabs[0])
  })

  it("updates the roving tabIndex so the newly active tab, not the first, is the one Tab reaches next", async () => {
    const user = userEvent.setup()
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    tabs[0]?.focus()
    await user.keyboard("{ArrowRight}")
    const refreshed = screen.getAllByRole("tab")
    expect(refreshed[0]?.getAttribute("tabindex")).toBe("-1")
    expect(refreshed[1]?.getAttribute("tabindex")).toBe("0")
  })
})
