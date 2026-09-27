import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import {
  EXTERNAL_REL,
  glyphFor,
  isExternalHref,
  NEW_TAB_NOTE,
  TextLink,
} from "@/shared/ui/navigation/text-link"
import { ActionLink } from "@/shared/ui/primitives/action-link"

const SOURCE = "https://www.ismp.org/recommendations/confused-drug-names-list"

const PDF =
  "https://www.ismp.org/system/files/resources/2023-10/ISMP_ConfusedDrugNames_2023.pdf"

function iconsOf(link: HTMLElement): SVGElement[] {
  return [...link.querySelectorAll("svg")]
}

describe("a link inside a sentence", () => {
  it("keeps the words it was given as its accessible name", () => {
    render(<TextLink href="/docs/limitations">What this cannot prove</TextLink>)
    const link = screen.getByRole("link", { name: "What this cannot prove" })
    expect(link.getAttribute("href")).toBe("/docs/limitations")
    expect(link.getAttribute("target")).toBe(null)
    expect(link.textContent).toBe("What this cannot prove")
  })

  it("marks itself as part of the link system, so no bare underlined word can pass for one", () => {
    render(<TextLink href="/metrics#policy">the policy</TextLink>)
    expect(screen.getByRole("link").getAttribute("data-link")).toBe("inline")
  })

  it("carries one decorative badge that screen readers skip", () => {
    render(<TextLink href="/docs/glossary">ISMP-2023</TextLink>)
    const icons = iconsOf(screen.getByRole("link"))
    expect(icons).toHaveLength(1)
    expect(icons[0]?.getAttribute("aria-hidden")).toBe("true")
    expect(icons[0]?.parentElement?.getAttribute("aria-hidden")).toBe("true")
  })

  it("keeps the badge on the line of the last word rather than alone on the next", () => {
    render(<TextLink href="/demo#tour">90-second tour</TextLink>)
    const tail = screen.getByRole("link").querySelector("svg")?.parentElement?.parentElement
    expect(tail?.textContent).toBe("tour")
  })

  it("lets a long address wrap instead of holding it on one line", () => {
    render(<TextLink href={SOURCE}>{SOURCE}</TextLink>)
    const link = screen.getByRole("link")
    expect(link.querySelector("svg")?.parentElement?.parentElement).toBe(link)
  })

  it("opens another site in a new tab without handing over the opener or the referrer", () => {
    render(<TextLink href={SOURCE}>ISMP list</TextLink>)
    const link = screen.getByRole("link", { name: `ISMP list ${NEW_TAB_NOTE}` })
    expect(link.getAttribute("href")).toBe(SOURCE)
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe(EXTERNAL_REL)
    expect(EXTERNAL_REL.split(" ").sort()).toEqual(["noopener", "noreferrer"])
  })

  it("picks its glyph from where the link goes", () => {
    expect(glyphFor("/docs/threat-model")).toBe("arrow")
    expect(glyphFor(SOURCE)).toBe("external")
    expect(glyphFor(PDF)).toBe("document")
  })

  it("tells an external address from a route on this site", () => {
    expect(isExternalHref(SOURCE)).toBe(true)
    expect(isExternalHref("http://example.org")).toBe(true)
    expect(isExternalHref("/metrics")).toBe(false)
    expect(isExternalHref("#claim")).toBe(false)
  })
})

describe("a link that ends a block", () => {
  it("keeps its name and hides its arrow from screen readers", () => {
    render(<MoreLink href="/docs/threat-model#receipt">How a receipt is sealed</MoreLink>)
    const link = screen.getByRole("link", { name: "How a receipt is sealed" })
    expect(link.getAttribute("data-link")).toBe("more")
    expect(link.getAttribute("target")).toBe(null)
    const icons = iconsOf(link)
    expect(icons).toHaveLength(1)
    expect(icons[0]?.getAttribute("aria-hidden")).toBe("true")
  })

  it("says it opens a new tab when it leaves the site", () => {
    render(<MoreLink href={SOURCE}>the price page</MoreLink>)
    const link = screen.getByRole("link", { name: `the price page ${NEW_TAB_NOTE}` })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe(EXTERNAL_REL)
  })

  it("clears the touch floor on its own, unlike a link inside a sentence", () => {
    const sheet = readFileSync("src/shared/ui/navigation/more-link/styles.module.css", "utf8")
    expect(sheet).toMatch(/\.more \{[^}]*min-height: var\(--target-touch\)/)
  })
})

describe("an anchor written without the link system", () => {
  it("still gets the designed treatment rather than a bare underline", () => {
    const global = readFileSync("src/styles/global.css", "utf8")
    const rule = global.match(/a:not\(\[class\]\) \{([^}]*)\}/)?.[1] ?? ""
    expect(rule).toContain("var(--link-underline)")
    expect(rule).toContain("var(--link-rule)")
    expect(global).toMatch(/a:not\(\[class\]\):hover \{[^}]*var\(--link-fill\)/)
  })
})

describe("an action link", () => {
  it("makes a link to another site behave the same way", () => {
    render(<ActionLink href={SOURCE}>Read the list</ActionLink>)
    const link = screen.getByRole("link", { name: `Read the list ${NEW_TAB_NOTE}` })
    expect(link.getAttribute("target")).toBe("_blank")
    expect(link.getAttribute("rel")).toBe(EXTERNAL_REL)
  })

  it("keeps a link inside the site in the same tab", () => {
    render(
      <ActionLink href="/docs" icon="forward">
        Read the docs
      </ActionLink>,
    )
    const link = screen.getByRole("link", { name: "Read the docs" })
    expect(link.getAttribute("target")).toBe(null)
    expect(link.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true")
  })
})
