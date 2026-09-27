import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BREADCRUMB_LABEL, Breadcrumbs } from "@/shared/ui/navigation/breadcrumbs"
import { DocHeader } from "@/shared/ui/navigation/doc-header"
import { DOCS_ROOT, DocsTreeProvider, docsTrail } from "@/shared/ui/navigation/docs-trail"
import type { DocsPage } from "@/shared/ui/navigation/docs-tree"

const route = vi.hoisted(() => ({ path: "/metrics/benchmark" }))

vi.mock("next/navigation", () => ({ usePathname: () => route.path }))

afterEach(() => {
  route.path = "/metrics/benchmark"
})

function page(href: string, label: string, children?: readonly DocsPage[]): DocsPage {
  return { href, label, title: label, summary: label, sections: [], children }
}

const PAGES: readonly DocsPage[] = [
  page("/docs", "Overview"),
  page("/how-it-works", "How it works"),
  page("/metrics", "Measurements", [page("/metrics/benchmark", "Benchmark")]),
  page("/docs/glossary", "Glossary"),
]

describe("breadcrumbs", () => {
  it("links every ancestor and marks the current page without a link", () => {
    render(<Breadcrumbs trail={[DOCS_ROOT]} current="Glossary" />)
    const nav = screen.getByRole("navigation", { name: BREADCRUMB_LABEL })
    expect(within(nav).getByRole("link", { name: "Docs" }).getAttribute("href")).toBe("/docs")
    const current = within(nav).getByText("Glossary")
    expect(current.getAttribute("aria-current")).toBe("page")
    expect(current.closest("a")).toBeNull()
  })
})

describe("the docs trail", () => {
  it("walks a child page up through its parent to the docs root", () => {
    expect(docsTrail(PAGES, "/metrics/benchmark")).toEqual({
      trail: [DOCS_ROOT, { href: "/metrics", label: "Measurements" }],
      current: "Benchmark",
    })
  })

  it("puts a page filed under /docs directly below the root", () => {
    expect(docsTrail(PAGES, "/docs/glossary")).toEqual({
      trail: [DOCS_ROOT],
      current: "Glossary",
    })
  })

  it("adds no trail where there is no depth to climb", () => {
    expect(docsTrail(PAGES, "/docs")).toBeNull()
    expect(docsTrail(PAGES, "/how-it-works")).toBeNull()
    expect(docsTrail(PAGES, "/elsewhere")).toBeNull()
  })

  it("renders inside the page header wherever the docs tree is provided", () => {
    render(
      <DocsTreeProvider pages={PAGES}>
        <DocHeader title="Benchmark" lede="Every figure." trail="Measurements" />
      </DocsTreeProvider>,
    )
    const nav = screen.getByRole("navigation", { name: BREADCRUMB_LABEL })
    expect(
      within(nav)
        .getAllByRole("link")
        .map((link) => link.getAttribute("href")),
    ).toEqual(["/docs", "/metrics"])
  })

  it("falls back to the header's own trail outside the docs tree", () => {
    render(<DocHeader title="Receipt" lede="A sealed order." trail="Orders" />)
    expect(screen.queryByRole("navigation", { name: BREADCRUMB_LABEL })).toBeNull()
    expect(screen.getByText("Orders")).toBeDefined()
  })
})
