import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Tabs } from "@/shared/ui/navigation/tabs"

const ITEMS = [
  { id: "one", label: "First", panel: <p>First panel</p> },
  { id: "two", label: "Second", panel: <p>Second panel</p> },
  { id: "three", label: "Third", panel: <p>Third panel</p> },
]

function tab(name: string): HTMLElement {
  return screen.getByRole("tab", { name })
}

describe("tabs follow the WAI-ARIA tabs pattern", () => {
  it("names the tablist and ties every tab to its panel", () => {
    render(<Tabs label="Reasons" items={ITEMS} />)
    expect(screen.getByRole("tablist", { name: "Reasons" })).toBeDefined()
    for (const item of ITEMS) {
      const control = tab(item.label)
      const panel = document.getElementById(control.getAttribute("aria-controls") ?? "")
      expect(panel?.getAttribute("role")).toBe("tabpanel")
      expect(panel?.getAttribute("aria-labelledby")).toBe(control.id)
    }
  })

  it("shows only the selected panel and keeps the others in the document", () => {
    render(<Tabs label="Reasons" items={ITEMS} />)
    expect(tab("First").getAttribute("aria-selected")).toBe("true")
    expect(
      screen.getByText("First panel").closest("[role=tabpanel]")?.hasAttribute("hidden"),
    ).toBe(false)
    expect(
      screen.getByText("Second panel").closest("[role=tabpanel]")?.hasAttribute("hidden"),
      "a hidden panel stays in the document so its content is never lost, only folded",
    ).toBe(true)
  })

  it("uses a roving tabindex so the tablist is one tab stop", () => {
    render(<Tabs label="Reasons" items={ITEMS} />)
    expect(tab("First").tabIndex).toBe(0)
    expect(tab("Second").tabIndex).toBe(-1)
    expect(tab("Third").tabIndex).toBe(-1)
  })

  it("moves with the arrow keys, Home and End, and wraps around", async () => {
    const user = userEvent.setup()
    render(<Tabs label="Reasons" items={ITEMS} />)
    tab("First").focus()
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(tab("Second"))
    expect(tab("Second").getAttribute("aria-selected")).toBe("true")
    await user.keyboard("{End}")
    expect(document.activeElement).toBe(tab("Third"))
    await user.keyboard("{ArrowRight}")
    expect(document.activeElement).toBe(tab("First"))
    await user.keyboard("{ArrowLeft}")
    expect(document.activeElement).toBe(tab("Third"))
    await user.keyboard("{Home}")
    expect(document.activeElement).toBe(tab("First"))
  })

  it("selects on click and honours a default", async () => {
    const user = userEvent.setup()
    render(<Tabs label="Reasons" items={ITEMS} defaultId="three" />)
    expect(tab("Third").getAttribute("aria-selected")).toBe("true")
    await user.click(tab("Second"))
    expect(tab("Second").getAttribute("aria-selected")).toBe("true")
    expect(tab("Third").getAttribute("aria-selected")).toBe("false")
  })
})

describe("anchored tabs answer to the address", () => {
  afterEach(() => {
    window.history.replaceState(null, "", "/")
  })

  it("uses the item ids as panel ids, so a link to #id names a panel", () => {
    render(<Tabs label="Reasons" items={ITEMS} anchored />)
    expect(document.getElementById("two")?.getAttribute("role")).toBe("tabpanel")
    expect(tab("Second").getAttribute("aria-controls")).toBe("two")
  })

  it("opens the panel the address names on arrival and scrolls to it", () => {
    const scrolled = vi.fn()
    Element.prototype.scrollIntoView = scrolled
    window.history.replaceState(null, "", "/#three")
    render(<Tabs label="Reasons" items={ITEMS} anchored />)
    expect(tab("Third").getAttribute("aria-selected")).toBe("true")
    expect(document.getElementById("three")?.hasAttribute("hidden")).toBe(false)
    expect(scrolled).toHaveBeenCalled()
  })

  it("follows a later hash change and ignores a hash that names no panel", () => {
    render(<Tabs label="Reasons" items={ITEMS} anchored />)
    act(() => {
      window.history.replaceState(null, "", "/#nowhere")
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    })
    expect(tab("First").getAttribute("aria-selected")).toBe("true")
    act(() => {
      window.history.replaceState(null, "", "/#two")
      window.dispatchEvent(new HashChangeEvent("hashchange"))
    })
    expect(tab("Second").getAttribute("aria-selected")).toBe("true")
  })

  it("writes the chosen panel into the address so it can be shared", async () => {
    const user = userEvent.setup()
    render(<Tabs label="Reasons" items={ITEMS} anchored />)
    await user.click(tab("Third"))
    expect(window.location.hash).toBe("#three")
  })

  it("leaves the address alone when not anchored", async () => {
    const user = userEvent.setup()
    render(<Tabs label="Reasons" items={ITEMS} />)
    await user.click(tab("Third"))
    expect(window.location.hash).toBe("")
  })
})
