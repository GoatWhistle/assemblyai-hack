import { existsSync } from "node:fs"
import ComparePage from "@app/(pages)/(docs)/compare/page"
import DocsOverviewPage from "@app/(pages)/(docs)/docs/page"
import { DOCS_PAGES } from "@app/(pages)/(docs)/docs-map"
import HowItWorksPage from "@app/(pages)/(docs)/how-it-works/page"
import BenchmarkPage from "@app/(pages)/(docs)/metrics/benchmark/page"
import OperationsPage from "@app/(pages)/(docs)/metrics/operations/page"
import MetricsPage from "@app/(pages)/(docs)/metrics/page"
import { cleanup, render, screen, within } from "@testing-library/react"
import type { ComponentType } from "react"
import { afterEach, describe, expect, it } from "vitest"
import { ReasonCode } from "@/domain"
import { shippedPolicyEntries } from "@/features/metrics/policy-figures"
import { flattenPages } from "@/shared/ui/navigation/docs-tree"

afterEach(() => {
  cleanup()
})

const PAGE_AT: Readonly<Record<string, ComponentType>> = {
  "/docs": DocsOverviewPage,
  "/how-it-works": HowItWorksPage,
  "/compare": ComparePage,
  "/metrics": MetricsPage,
  "/metrics/benchmark": BenchmarkPage,
  "/metrics/operations": OperationsPage,
}

const VISUAL = "table, figure, ol, ul, dl, details, [role=tablist]"

const WORDS_BEFORE_VISUAL = 120

function wordsBeforeFirstVisual(root: HTMLElement): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT)
  let words = 0
  for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
    if (node instanceof HTMLElement && node.matches(VISUAL)) {
      return words
    }
    if (node.nodeType === Node.TEXT_NODE) {
      words += (node.textContent ?? "").split(/\s+/).filter((word) => word.length > 0).length
    }
  }
  return words
}

describe("the docs map and the pages agree", () => {
  const pages = flattenPages(DOCS_PAGES)

  it("has a page file and a rendered page for every entry", () => {
    for (const page of pages) {
      expect(existsSync(`app/(pages)/(docs)${page.href}/page.tsx`), page.href).toBe(true)
      expect(PAGE_AT[page.href], `${page.href} is not rendered by this test`).toBeDefined()
    }
    expect(Object.keys(PAGE_AT).sort()).toEqual(pages.map((page) => page.href).sort())
  })

  for (const page of pages) {
    it(`${page.href} renders every section its table of contents lists, in order, with a heading`, () => {
      const Page = PAGE_AT[page.href] as ComponentType
      const { container } = render(<Page />)
      const rendered = [...container.querySelectorAll("section[id]")]
        .map((section) => section.id)
        .filter((id) => page.sections.some((section) => section.id === id))
      expect(rendered).toEqual(page.sections.map((section) => section.id))
      for (const section of page.sections) {
        const element = container.querySelector(`section#${section.id}`)
        expect(element?.querySelector("h2"), section.id).not.toBeNull()
      }
    })

    it(`${page.href} reaches its first table, list or figure within ${WORDS_BEFORE_VISUAL} words`, () => {
      const Page = PAGE_AT[page.href] as ComponentType
      const { container } = render(<Page />)
      expect(wordsBeforeFirstVisual(container)).toBeLessThanOrEqual(WORDS_BEFORE_VISUAL)
    })
  }

  it("gives every page a one-line summary for the map", () => {
    for (const page of pages) {
      expect(page.summary.length, page.href).toBeGreaterThan(20)
      expect(page.summary.endsWith("."), page.href).toBe(true)
    }
  })
})

describe("the docs overview states the product's hard claim", () => {
  it("says a published pair is asked again even at full certainty, and a yes does not answer it", () => {
    render(<DocsOverviewPage />)
    expect(
      screen.getByText(/triggers a mandatory re-ask even at certainty 1\.00/),
    ).toBeDefined()
    expect(screen.getByText(/only a spoken name answers it, never a yes/)).toBeDefined()
  })

  it("shows the look-alike moment the shipped gate decides, and what a threshold alone writes", () => {
    const { container } = render(<DocsOverviewPage />)
    const claim = container.querySelector<HTMLElement>("section#claim")
    expect(claim).not.toBeNull()
    const strip = within(claim as HTMLElement)
    expect(strip.getByText("certainty 1.00")).toBeDefined()
    expect(strip.getByText(ReasonCode.LasaHit)).toBeDefined()
    expect(strip.getByText("Written: morphine")).toBeDefined()
  })

  it("offers all three reasons to re-ask as tabs", () => {
    render(<DocsOverviewPage />)
    for (const code of [
      ReasonCode.LowConfidence,
      ReasonCode.ValidatorChecksum,
      ReasonCode.LasaHit,
    ]) {
      expect(screen.getByRole("tab", { name: code })).toBeDefined()
    }
  })

  it("prints every key number beside the command that produced it", () => {
    const { container } = render(<DocsOverviewPage />)
    for (const entry of shippedPolicyEntries()) {
      const row = container.querySelector(`tr[data-row="${entry.id}"]`)
      expect(row?.querySelector('[data-column="value"]')?.textContent).toBe(entry.row.value)
      expect(row?.querySelector('[data-column="command"]')?.textContent).toBe(entry.row.command)
    }
  })

  it("maps every other docs page with its summary", () => {
    render(<DocsOverviewPage />)
    for (const page of flattenPages(DOCS_PAGES).filter((entry) => entry.href !== "/docs")) {
      expect(screen.getByText(page.summary)).toBeDefined()
    }
  })
})
