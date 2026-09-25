import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { OrderPageView } from "@/features/receipt/order-page"
import { SiteHeader } from "@/shared/ui/primitives/site-header"

vi.mock("@/features/receipt/order-check", () => ({ OrderCheck: () => null }))

const SHEET = readFileSync("src/shared/ui/primitives/site-header/styles.module.css", "utf8")

function phoneBlock(): string {
  const start = SHEET.indexOf("@media (max-width: 40rem)")
  return start < 0 ? "" : SHEET.slice(start)
}

describe("AU4: the section nav on a phone", () => {
  it("keeps the links on one row that scrolls sideways instead of wrapping to a second row", () => {
    const block = phoneBlock()
    expect(block, "the phone breakpoint must exist").not.toBe("")
    const nav = block.slice(block.indexOf(".nav"), block.indexOf("}", block.indexOf(".nav")))
    expect(nav).toContain("flex-wrap: nowrap")
    expect(nav).toContain("overflow-x: auto")
    const link = block.slice(block.indexOf(".link"), block.indexOf("}", block.indexOf(".link")))
    expect(link).toContain("white-space: nowrap")
  })

  it("leaves room for the focus ring inside the scrolling row", () => {
    const block = phoneBlock()
    const nav = block.slice(block.indexOf(".nav"), block.indexOf("}", block.indexOf(".nav")))
    expect(nav).toMatch(/padding: var\(--space-/)
  })
})

describe("AU4: the order page is not the live call", () => {
  it("marks no section as current on the receipt page", () => {
    render(<OrderPageView sessionId="no-such-session" />)
    const nav = screen.getByRole("navigation", { name: "Sections" })
    expect(nav.querySelector("[aria-current=page]")).toBeNull()
  })

  it("still marks the live call on the live page", () => {
    render(<SiteHeader current="live" />)
    expect(screen.getByRole("link", { name: "Live call" }).getAttribute("aria-current")).toBe(
      "page",
    )
  })
})
