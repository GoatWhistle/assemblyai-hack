import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { PageShell } from "@/shared/ui/layout/page-shell"
import {
  DISCLAIMER_AFFILIATION,
  DISCLAIMER_BODY,
  DISCLAIMER_NO_REAL_DATA,
  DISCLAIMER_TITLE,
  DisclaimerNotice,
  NOTICE_LABEL,
  PRINT_BODY,
} from "@/shared/ui/states/disclaimer"

const PAGES = [
  "src/features/intake/intake-screen/index.tsx",
  "app/(pages)/demo/page.tsx",
  "src/shared/ui/navigation/docs-shell/index.tsx",
  "src/features/not-found/index.tsx",
  "src/features/receipt/order-page/index.tsx",
  "app/(pages)/deck/page.tsx",
]

function copiesOf(text: string): number {
  return [...document.querySelectorAll("body *")].filter(
    (node) => node.children.length === 0 && node.textContent === text,
  ).length
}

describe("the medical disclaimer", () => {
  it("states that this is not a medical device and that the data is synthetic", () => {
    render(<DisclaimerNotice />)
    expect(screen.getByText(DISCLAIMER_TITLE)).not.toBeNull()
    expect(DISCLAIMER_TITLE).toMatch(/not a medical device/i)
    expect(DISCLAIMER_BODY).toMatch(/synthetic data only/i)
    expect(DISCLAIMER_BODY).toMatch(/no real patients/i)
  })

  it("claims no regulatory approval", () => {
    expect(DISCLAIMER_BODY).toMatch(/not a regulatory approval/i)
  })

  it("names its substance in the mark itself, so the closed state is not silent", () => {
    render(<DisclaimerNotice />)
    const mark = screen.getByRole("button", { name: NOTICE_LABEL })
    expect(NOTICE_LABEL).toMatch(/not a medical device/i)
    expect(mark.getAttribute("aria-expanded")).toBe("false")
  })

  for (const page of PAGES) {
    it(`reaches ${page} through the shared page shell`, () => {
      const source = readFileSync(page, "utf8")
      expect(
        /<PageShell|<DocsShell/.test(source),
        `${page} must render the page shell, whose header carries the disclaimer mark`,
      ).toBe(true)
      expect(
        /<Disclaimer\s*\/>/.test(source),
        "the block version was retired in favour of the header mark",
      ).toBe(false)
    })
  }

  it("is carried by the header of every shell, once, with a print copy at the end", () => {
    render(
      <PageShell>
        <main>content</main>
      </PageShell>,
    )
    const mark = screen.getByRole("button", { name: NOTICE_LABEL })
    expect(mark.closest("header")).not.toBeNull()
    for (const text of [
      DISCLAIMER_TITLE,
      DISCLAIMER_BODY,
      DISCLAIMER_AFFILIATION,
      DISCLAIMER_NO_REAL_DATA,
    ]) {
      expect(copiesOf(text), `exactly one readable copy of: ${text}`).toBe(1)
    }
    const print = document.querySelector("[data-title][data-body]")
    expect(print?.getAttribute("aria-hidden")).toBe("true")
    expect(print?.getAttribute("data-title")).toBe(DISCLAIMER_TITLE)
    expect(print?.getAttribute("data-body")).toBe(PRINT_BODY)
    expect(print?.textContent, "the print copy carries no text node to read twice").toBe("")
    const shell = print?.parentElement
    expect(shell?.lastElementChild, "the print copy closes the page").toBe(print)
  })
})

describe("the two parts a reader could mistake us for claiming", () => {
  it("denies affiliation with every body it cites", () => {
    render(<DisclaimerNotice />)
    expect(screen.getByText(DISCLAIMER_AFFILIATION)).not.toBeNull()
    for (const body of ["ISMP", "FDA", "Joint Commission", "21 CFR"]) {
      expect(
        DISCLAIMER_AFFILIATION,
        `this project quotes ${body} as evidence that read-back is already required; quoting a regulator without denying affiliation invites a reader to think the software was reviewed by one`,
      ).toContain(body)
    }
    expect(DISCLAIMER_AFFILIATION).toMatch(/not affiliated with, endorsed by, or reviewed by/i)
  })

  it("tells the reader not to enter real patient data", () => {
    render(<DisclaimerNotice />)
    expect(
      screen.getByText(DISCLAIMER_NO_REAL_DATA),
      "a medical-looking intake form invites real data, and the honest instruction is an instruction rather than an implication of the word synthetic",
    ).not.toBeNull()
    expect(DISCLAIMER_NO_REAL_DATA).toMatch(/do not enter real patient data/i)
    expect(PRINT_BODY).toContain(DISCLAIMER_NO_REAL_DATA)
  })
})
