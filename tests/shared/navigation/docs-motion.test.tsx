import { readFileSync } from "node:fs"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { GLIDE_READY_ATTRIBUTE, placeMarker } from "@/shared/ui/motion/use-glide"
import {
  AnchorArrival,
  ARRIVAL_ATTRIBUTE,
  ARRIVAL_HOLD_MS,
  ARRIVAL_IDLE_MS,
  arrivalMark,
  samePageFragment,
} from "@/shared/ui/navigation/docs-shell/anchor-arrival"
import type { DocsPage } from "@/shared/ui/navigation/docs-tree"
import { Toc } from "@/shared/ui/navigation/toc"

const route = vi.hoisted(() => ({ path: "/guide" }))

vi.mock("next/navigation", () => ({ usePathname: () => route.path }))

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
]

function page(): HTMLElement {
  document.body.innerHTML = `
    <a id="toc-link" href="#second">Second</a>
    <a id="away" href="/elsewhere#second">Away</a>
    <a id="skip" href="#main">Skip</a>
    <main id="main">
      <section id="first" aria-labelledby="first-title"><h2 id="first-title">First</h2></section>
      <section id="second" aria-labelledby="second-title"><h2 id="second-title">Second</h2></section>
    </main>`
  return document.getElementById("second-title") as HTMLElement
}

function click(id: string) {
  const link = document.getElementById(id) as HTMLAnchorElement
  link.addEventListener("click", (event) => event.preventDefault(), { once: true })
  link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }))
}

beforeEach(() => {
  window.history.replaceState(null, "", "/guide")
})

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ""
})

describe("an in-page jump in the docs lands visibly", () => {
  it("treats only a fragment of the page being read as an in-page jump", () => {
    page()
    const at = window.location
    expect(samePageFragment(document.getElementById("toc-link") as HTMLAnchorElement, at)).toBe(
      "second",
    )
    expect(
      samePageFragment(document.getElementById("away") as HTMLAnchorElement, at),
    ).toBeNull()
  })

  it("marks the heading that names a section rather than the whole section", () => {
    const heading = page()
    expect(arrivalMark(document.getElementById("second") as HTMLElement)).toBe(heading)
    expect(arrivalMark(heading)).toBe(heading)
  })

  it("marks and focuses the heading once the scroll settles, then lets the mark go", async () => {
    vi.useFakeTimers()
    const heading = page()
    render(<AnchorArrival mainId="main" />, {
      container: document.body.appendChild(document.createElement("div")),
    })
    click("toc-link")
    expect(heading.hasAttribute(ARRIVAL_ATTRIBUTE)).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARRIVAL_IDLE_MS)
    })
    expect(heading.hasAttribute(ARRIVAL_ATTRIBUTE)).toBe(true)
    expect(document.activeElement).toBe(heading)
    expect(heading.getAttribute("tabindex")).toBe("-1")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARRIVAL_HOLD_MS)
    })
    expect(heading.hasAttribute(ARRIVAL_ATTRIBUTE)).toBe(false)
  })

  it("leaves the skip link and links to other pages alone", async () => {
    vi.useFakeTimers()
    page()
    render(<AnchorArrival mainId="main" />, {
      container: document.body.appendChild(document.createElement("div")),
    })
    click("skip")
    click("away")
    await act(async () => {
      await vi.advanceTimersByTimeAsync(ARRIVAL_IDLE_MS)
    })
    expect(document.querySelector(`[${ARRIVAL_ATTRIBUTE}]`)).toBeNull()
    expect(document.getElementById("main")?.hasAttribute("tabindex")).toBe(false)
  })
})

describe("the active marker glides instead of jumping", () => {
  it("places the marker over the active entry and shows it only when one exists", () => {
    document.body.innerHTML = `<div id="rail"><span id="marker"></span><a id="a"></a><a id="b" aria-current="page"></a></div>`
    const rail = document.getElementById("rail") as HTMLElement
    const marker = document.getElementById("marker") as HTMLElement
    const b = document.getElementById("b") as HTMLElement
    b.getBoundingClientRect = () => new DOMRect(10, 60, 200, 44)
    placeMarker(rail, marker, '[aria-current="page"]', true)
    expect(rail.hasAttribute(GLIDE_READY_ATTRIBUTE)).toBe(true)
    expect([
      marker.style.top,
      marker.style.left,
      marker.style.width,
      marker.style.height,
    ]).toEqual(["60px", "10px", "200px", "44px"])
    expect(marker.style.transform).toBe("")
    b.removeAttribute("aria-current")
    placeMarker(rail, marker, '[aria-current="page"]', true)
    expect(rail.hasAttribute(GLIDE_READY_ATTRIBUTE)).toBe(false)
  })

  it("starts the glide from where the marker was, so the move is a transform", () => {
    document.body.innerHTML = `<div id="rail"><span id="marker"></span><a id="a" aria-current="page"></a><a id="b"></a></div>`
    const rail = document.getElementById("rail") as HTMLElement
    const marker = document.getElementById("marker") as HTMLElement
    const a = document.getElementById("a") as HTMLElement
    const b = document.getElementById("b") as HTMLElement
    a.getBoundingClientRect = () => new DOMRect(0, 0, 200, 40)
    b.getBoundingClientRect = () => new DOMRect(0, 80, 200, 40)
    placeMarker(rail, marker, '[aria-current="page"]', true)
    marker.getBoundingClientRect = () => new DOMRect(0, 0, 200, 40)
    const written: string[] = []
    const style = marker.style
    Object.defineProperty(style, "transform", {
      configurable: true,
      get: () => written.at(-1) ?? "",
      set: (value: string) => {
        written.push(value)
      },
    })
    a.removeAttribute("aria-current")
    b.setAttribute("aria-current", "page")
    placeMarker(rail, marker, '[aria-current="page"]', true)
    expect(written).toContain("translate(0px, -80px) scale(1, 1)")
    expect(written.at(-1)).toBe("")
    expect(style.top).toBe("80px")
    Reflect.deleteProperty(style, "transform")
  })

  it("renders the table of contents with its marker beside the entries", () => {
    route.path = "/guide"
    render(<Toc pages={PAGES} />)
    const nav = screen.getByRole("navigation", { name: "On this page" })
    expect(nav.querySelector('[aria-hidden="true"]')).not.toBeNull()
    expect(nav.querySelectorAll("a")).toHaveLength(2)
  })

  it("marks a landed table row by tinting the row, never by adding a box that would become a cell", () => {
    const sheet = readFileSync("src/shared/ui/navigation/docs-shell/styles.module.css", "utf8")
    expect(sheet).toMatch(/\.main \[data-arrival\]:not\(tr\)::before \{\s*content: "";/)
    expect(sheet).not.toMatch(/\.main \[data-arrival\]::before/)
    expect(sheet).toMatch(/\.main tr\[data-arrival\] \{\s*animation: row-arrival/)
    expect(sheet).toMatch(
      /prefers-reduced-motion: reduce[\s\S]*\.main tr\[data-arrival\] \{[^}]*background-color: var\(--select-surface\);/,
    )
  })
})
