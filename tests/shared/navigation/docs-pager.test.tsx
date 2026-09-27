import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DocsPager, PAGER_LABEL } from "@/shared/ui/navigation/docs-pager"
import type { DocsPage } from "@/shared/ui/navigation/docs-tree"

const route = vi.hoisted(() => ({ path: "/two" }))

vi.mock("next/navigation", () => ({ usePathname: () => route.path }))

afterEach(() => {
  route.path = "/two"
})

function page(href: string, label: string): DocsPage {
  return { href, label, title: label, summary: label, sections: [] }
}

const PAGES: readonly DocsPage[] = [
  page("/one", "First page"),
  page("/two", "Second page"),
  page("/three", "Third page"),
]

function pager() {
  return screen.getByRole("navigation", { name: PAGER_LABEL })
}

describe("the docs pager", () => {
  it("names both directions with the word and the page title", () => {
    render(<DocsPager pages={PAGES} />)
    const previous = within(pager()).getByRole("link", { name: "Previous page: First page" })
    const next = within(pager()).getByRole("link", { name: "Next page: Third page" })
    expect(previous.getAttribute("href")).toBe("/one")
    expect(previous.getAttribute("rel")).toBe("prev")
    expect(next.getAttribute("href")).toBe("/three")
    expect(next.getAttribute("rel")).toBe("next")
    expect(previous.textContent).toBe("PreviousFirst page")
    expect(next.textContent).toBe("NextThird page")
  })

  it("points an arrow each way, hidden from screen readers", () => {
    render(<DocsPager pages={PAGES} />)
    const arrows = within(pager())
      .getAllByRole("link")
      .map((link) => link.querySelector("svg path")?.getAttribute("d") ?? "")
    expect(arrows).toHaveLength(2)
    expect(arrows[0]).not.toBe(arrows[1])
    for (const svg of pager().querySelectorAll("svg")) {
      expect(svg.getAttribute("aria-hidden")).toBe("true")
    }
  })

  it("makes the whole block the link, so the title is inside the target", () => {
    render(<DocsPager pages={PAGES} />)
    const next = within(pager()).getByRole("link", { name: /Next page/ })
    expect(within(next).getByText("Third page")).toBeDefined()
    expect(within(next).getByText("Next")).toBeDefined()
  })

  it("offers only the direction that exists at either end", () => {
    route.path = "/one"
    const first = render(<DocsPager pages={PAGES} />)
    expect(
      within(pager())
        .getAllByRole("link")
        .map((link) => link.getAttribute("rel")),
    ).toEqual(["next"])
    first.unmount()
    route.path = "/three"
    render(<DocsPager pages={PAGES} />)
    expect(
      within(pager())
        .getAllByRole("link")
        .map((link) => link.getAttribute("rel")),
    ).toEqual(["prev"])
  })
})
