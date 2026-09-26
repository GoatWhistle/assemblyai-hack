import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { DocsNav } from "@/shared/ui/navigation/docs-nav"
import { DocsPager } from "@/shared/ui/navigation/docs-pager"
import type { DocsPage } from "@/shared/ui/navigation/docs-tree"
import { pageAt } from "@/shared/ui/navigation/docs-tree"
import { TOC_TITLE, Toc } from "@/shared/ui/navigation/toc"
import { pickActive } from "@/shared/ui/navigation/use-active-section"

const route = vi.hoisted(() => ({ path: "/guide" }))

vi.mock("next/navigation", () => ({ usePathname: () => route.path }))

afterEach(() => {
  route.path = "/guide"
})

const PAGES: readonly DocsPage[] = [
  {
    href: "/guide",
    label: "Guide",
    title: "Guide",
    summary: "The guide.",
    sections: [
      { id: "first", label: "First part" },
      { id: "second", label: "Second part" },
    ],
  },
  {
    href: "/numbers",
    label: "Numbers",
    title: "Numbers",
    summary: "The numbers.",
    sections: [{ id: "only", label: "Only part" }],
    children: [
      {
        href: "/numbers/detail",
        label: "Detail",
        title: "Detail",
        summary: "The detail.",
        sections: [],
      },
    ],
  },
]

describe("the docs sidebar", () => {
  it("lists every page, child pages included, as links", () => {
    render(<DocsNav pages={PAGES} />)
    const nav = screen.getByRole("navigation", { name: "Documentation" })
    for (const label of ["Guide", "Numbers", "Detail"]) {
      expect(within(nav).getByRole("link", { name: label })).toBeDefined()
    }
  })

  it("marks the current page with aria-current and lists its sections", () => {
    route.path = "/guide"
    render(<DocsNav pages={PAGES} />)
    expect(screen.getByRole("link", { name: "Guide" }).getAttribute("aria-current")).toBe(
      "page",
    )
    expect(screen.getByRole("link", { name: "Numbers" }).getAttribute("aria-current")).toBe(
      null,
    )
    const sections = screen.getByRole("list", { name: "Sections of Guide" })
    expect(
      within(sections).getByRole("link", { name: "First part" }).getAttribute("href"),
    ).toBe("#first")
  })

  it("finds a child page as current and flags its parent as containing it", () => {
    route.path = "/numbers/detail/"
    render(<DocsNav pages={PAGES} />)
    expect(screen.getByRole("link", { name: "Detail" }).getAttribute("aria-current")).toBe(
      "page",
    )
    expect(screen.getByRole("link", { name: "Numbers" }).hasAttribute("data-within")).toBe(true)
  })

  it("collapses into a toggle that reports its state and closes on Escape", async () => {
    const user = userEvent.setup()
    render(<DocsNav pages={PAGES} />)
    const toggle = screen.getByRole("button", { name: /Docs/ })
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(document.getElementById(toggle.getAttribute("aria-controls") ?? "")).not.toBeNull()
    await user.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    await user.keyboard("{Escape}")
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
    expect(document.activeElement).toBe(toggle)
  })

  it("r1-A2-F8: closes the drawer when a section link is followed", async () => {
    const user = userEvent.setup()
    route.path = "/guide"
    render(<DocsNav pages={PAGES} />)
    const toggle = screen.getByRole("button", { name: /Docs/ })
    await user.click(toggle)
    expect(toggle.getAttribute("aria-expanded")).toBe("true")
    await user.click(screen.getByRole("link", { name: "Second part" }))
    expect(toggle.getAttribute("aria-expanded")).toBe("false")
  })

  it("r1-A1-06: lists a related group of links beside the docs pages", () => {
    render(
      <DocsNav
        pages={PAGES}
        related={{
          label: "Replay hub",
          summary: "The judge's page.",
          links: [{ href: "/demo#replay", label: "Replay" }],
        }}
      />,
    )
    const group = screen.getByRole("list", { name: "Replay hub" })
    expect(within(group).getByRole("link", { name: "Replay" }).getAttribute("href")).toBe(
      "/demo#replay",
    )
  })
})

describe("r1-A1-11: the docs pager", () => {
  it("links the previous and next page in sidebar order, child pages included", () => {
    route.path = "/numbers"
    render(<DocsPager pages={PAGES} />)
    const pager = screen.getByRole("navigation", { name: "Previous and next page" })
    expect(within(pager).getByRole("link", { name: /Guide/ }).getAttribute("href")).toBe(
      "/guide",
    )
    expect(
      within(pager)
        .getByRole("link", { name: /Detail/ })
        .getAttribute("href"),
    ).toBe("/numbers/detail")
  })
})

describe("the on-page table of contents", () => {
  it("lists the current page's sections as fragment links", () => {
    route.path = "/guide"
    render(<Toc pages={PAGES} />)
    const toc = screen.getByRole("navigation", { name: TOC_TITLE })
    expect(
      within(toc)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["#first", "#second"])
  })

  it("renders nothing for a page with fewer than two sections", () => {
    route.path = "/numbers"
    const { container } = render(<Toc pages={PAGES} />)
    expect(container.innerHTML).toBe("")
  })

  it("resolves a trailing slash and an unknown path", () => {
    expect(pageAt(PAGES, "/guide/")?.label).toBe("Guide")
    expect(pageAt(PAGES, "/elsewhere")).toBe(null)
    expect(pageAt(PAGES, null)).toBe(null)
  })
})

describe("scroll-spy picks the section being read", () => {
  it("takes the first visible section in document order", () => {
    expect(pickActive(["a", "b", "c"], new Set(["c", "b"]), false)).toBe("b")
  })

  it("takes the last section at the bottom of the page, where it can never reach the top", () => {
    expect(pickActive(["a", "b", "c"], new Set(["b"]), true)).toBe("c")
  })

  it("keeps the previous choice when nothing is visible", () => {
    expect(pickActive(["a", "b"], new Set(), false)).toBe(null)
  })
})
