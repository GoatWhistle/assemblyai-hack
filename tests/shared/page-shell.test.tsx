import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { NotFoundScreen } from "@/features/not-found"
import { OrderPageView } from "@/features/receipt/order-page"
import { PageShell } from "@/shared/ui/layout/page-shell"
import { DocsShell } from "@/shared/ui/navigation/docs-shell"

vi.mock("next/navigation", () => ({ usePathname: () => "/docs" }))
vi.mock("@/features/receipt/order-check", () => ({ OrderCheck: () => null }))

const SHELL_SHEETS = [
  "src/shared/ui/layout/page-shell/styles.module.css",
  "src/shared/ui/navigation/docs-shell/styles.module.css",
  "src/shared/ui/primitives/site-header/styles.module.css",
  "app/(pages)/deck/styles.module.css",
]

const HEADER_IMPORT =
  /from\s+["'](?:@\/shared\/ui\/primitives\/site-header|\.\.?\/[^"']*site-header)["']/

function breakpointTokens(): Set<string> {
  const source = readFileSync("src/styles/tokens/semantic.css", "utf8")
  return new Set(
    [...source.matchAll(/--bp-[a-z0-9-]+:\s*([0-9.]+rem)/g)].map((m) => m[1] ?? ""),
  )
}

async function sources(): Promise<string[]> {
  const files: string[] = []
  for (const pattern of ["src/**/*.tsx", "app/**/*.tsx"]) {
    for await (const file of glob(pattern)) {
      files.push(file.replaceAll("\\", "/"))
    }
  }
  return files
}

function sharesContainer(header: HTMLElement, main: HTMLElement): boolean {
  const shell = header.parentElement
  return shell?.contains(main) === true
}

describe("one page shell for every route", () => {
  it("renders the site header only through the shell, so no page can put it in its own column", async () => {
    const files = await sources()
    const importers = files.filter(
      (file) =>
        !file.startsWith("src/shared/ui/primitives/site-header/") &&
        HEADER_IMPORT.test(readFileSync(file, "utf8")),
    )
    expect(files.length).toBeGreaterThan(0)
    expect(importers).toEqual(["src/shared/ui/layout/page-shell/index.tsx"])
  })

  it("puts the header and the page content in the same container, so their edges align", () => {
    render(
      <PageShell current="replay">
        <main>content</main>
      </PageShell>,
    )
    expect(sharesContainer(screen.getByRole("banner"), screen.getByRole("main"))).toBe(true)
  })

  it("wraps the docs grid in the same shell as every other page", () => {
    render(
      <DocsShell nav={<nav aria-label="Docs">nav</nav>} toc={null} mainId="main">
        <p>prose</p>
      </DocsShell>,
    )
    const header = screen.getByRole("banner")
    expect(sharesContainer(header, screen.getByRole("main"))).toBe(true)
    expect(
      header.parentElement?.contains(screen.getByRole("navigation", { name: "Docs" })),
    ).toBe(true)
  })

  it("keeps the receipt and the missing-page screens inside the shell", () => {
    const receipt = render(<OrderPageView sessionId={null} />)
    expect(sharesContainer(screen.getByRole("banner"), screen.getByRole("main"))).toBe(true)
    receipt.unmount()
    render(<NotFoundScreen />)
    expect(sharesContainer(screen.getByRole("banner"), screen.getByRole("main"))).toBe(true)
  })

  it("marks no section as current on a page that belongs to none", () => {
    render(
      <PageShell>
        <main>content</main>
      </PageShell>,
    )
    const nav = screen.getByRole("navigation", { name: "Sections" })
    expect(nav.querySelector("[aria-current=page]")).toBeNull()
  })

  it("takes every shell breakpoint from the breakpoint tokens", () => {
    const allowed = breakpointTokens()
    expect(allowed.size).toBeGreaterThanOrEqual(4)
    const offenders: string[] = []
    for (const file of SHELL_SHEETS) {
      const source = readFileSync(file, "utf8")
      for (const m of source.matchAll(/\((?:min|max)-width:\s*([0-9.]+[a-z]+)\)/g)) {
        if (!allowed.has(m[1] ?? "")) {
          offenders.push(`${file}: ${m[0]} is not a --bp-* token value`)
        }
      }
    }
    expect(offenders).toEqual([])
  })

  it("lets the shell, not a page, own the maximum width and the gutters", async () => {
    const offenders: string[] = []
    for (const pattern of ["src/**/*.css", "app/**/*.css"]) {
      for await (const file of glob(pattern)) {
        const path = file.replaceAll("\\", "/")
        if (
          path.startsWith("src/styles/") ||
          path.startsWith("src/shared/ui/layout/page-shell/")
        ) {
          continue
        }
        const source = readFileSync(path, "utf8")
        if (/max-width:\s*var\(--shell-max\)/.test(source)) {
          offenders.push(`${path} re-creates the shell's maximum width`)
        }
      }
    }
    expect(offenders).toEqual([])
  })
})
