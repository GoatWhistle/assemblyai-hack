import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NOT_FOUND_DESTINATIONS, NotFoundScreen } from "@/features/not-found"

vi.mock("next/navigation", () => ({ usePathname: () => "/no-such-page" }))

describe("the missing-page screen", () => {
  it("names the address that was asked for", () => {
    render(<NotFoundScreen />)
    expect(screen.getByText("/no-such-page").tagName).toBe("CODE")
  })

  it("offers the free replay first, then the call, which bills, and the docs", () => {
    render(<NotFoundScreen />)
    const nav = screen.getByRole("navigation", { name: "Where to go instead" })
    const names = within(nav)
      .getAllByRole("link")
      .map((link) => link.textContent ?? "")
    expect(names[0]).toMatch(/Watch the .*replay/)
    expect(names[1]).toBe("Start a call")
    expect(within(nav).getByRole("link", { name: "Start a call" }).getAttribute("href")).toBe(
      "/",
    )
    expect(within(nav).getByRole("link", { name: /Watch the .*replay/ })).toBeDefined()
    expect(within(nav).getByRole("link", { name: "Read the docs" }).getAttribute("href")).toBe(
      "/docs",
    )
  })

  it("lists the main pages as links a reader can go to directly", () => {
    render(<NotFoundScreen />)
    const hrefs = within(screen.getByRole("main"))
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
    for (const destination of NOT_FOUND_DESTINATIONS) {
      expect(hrefs).toContain(destination.href)
    }
    expect(NOT_FOUND_DESTINATIONS.map((page) => page.href)).toEqual([
      "/how-it-works",
      "/compare",
      "/metrics",
      "/order",
    ])
  })

  it("keeps a skip link to the content", () => {
    render(<NotFoundScreen />)
    expect(screen.getByRole("link", { name: "Skip to the content" }).getAttribute("href")).toBe(
      "#main",
    )
  })
})
