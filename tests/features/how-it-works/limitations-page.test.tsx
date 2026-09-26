import { readFileSync } from "node:fs"
import LimitationsPage from "@app/(pages)/(docs)/docs/limitations/page"
import ThreatModelPage from "@app/(pages)/(docs)/docs/threat-model/page"
import HowItWorksPage from "@app/(pages)/(docs)/how-it-works/page"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { WITNESS_BOUNDARY_NOTE } from "@/domain"
import { LIMITATIONS } from "@/features/how-it-works/limits"

afterEach(() => {
  cleanup()
})

const COVERED_BY: Readonly<Record<string, string>> = {
  "The evidentiary chain does not survive a hostile client": "provenance",
  "A caller who corrects themselves inside one utterance is detected only through six markers":
    "self-correction",
  "The pair rule covers the 2023 ISMP list and nothing else": "lasa",
  "The evaluation corpus is synthesised": "synthesised",
  "Thresholds are chosen defaults, not measured optima": "thresholds",
  "Our own pre-registered hypothesis failed": "hypothesis",
  "Two of our own guarantees were bypassable": "bypassable",
  "Security hardening we recorded and did not do": "hardening",
  "Close codes are observations, not specification": "close-codes",
  "Voice audio leaves this application and goes to a third-party vendor": "vendor-audio",
  "In a real emergency, do not use this application": "emergency",
  "This is not a medical device": "device",
  "The regulatory citations, and what we have not sourced about them": "citations",
}

function headings(): readonly string[] {
  return readFileSync("docs/limitations.md", "utf8")
    .split("\n")
    .filter((line) => line.startsWith("## "))
    .map((line) => line.slice(3).trim())
}

describe("r1-A5-06: every limitation in docs/limitations.md has a visible entry on the site", () => {
  it("maps each heading of the file to an entry, so a new heading fails until the site covers it", () => {
    for (const heading of headings()) {
      const id = COVERED_BY[heading]
      expect(id, `"${heading}" has no entry on /docs/limitations`).toBeDefined()
      expect(LIMITATIONS.some((entry) => entry.id === id)).toBe(true)
    }
  })

  it("renders every entry as visible text with its status, not behind a disclosure", () => {
    const { container } = render(<LimitationsPage />)
    expect(container.querySelector("details")).toBeNull()
    for (const entry of LIMITATIONS) {
      const item = container.querySelector(`#limit-${entry.id}`)
      expect(item?.textContent, entry.id).toContain(entry.status)
      expect(item?.textContent, entry.id).toContain(entry.title)
    }
  })

  it("points how-it-works at the full list and the threat model", () => {
    const { container } = render(<HowItWorksPage />)
    expect(container.querySelector('a[href="/docs/limitations"]')).not.toBeNull()
    expect(container.querySelector('a[href="/docs/threat-model"]')).not.toBeNull()
  })
})

describe("r1-A5-07: the threat model states the vendor witness and how to check a receipt", () => {
  it("quotes WITNESS_BOUNDARY_NOTE and names all three verdicts", () => {
    const { container } = render(<ThreatModelPage />)
    const text = container.textContent ?? ""
    expect(text).toContain(WITNESS_BOUNDARY_NOTE.slice(1))
    for (const verdict of ["witnessed", "not_witnessed", "unavailable"]) {
      expect(text).toContain(verdict)
    }
  })

  it("links the receipt checker, and says why no sample receipt is shown", () => {
    const { container } = render(<ThreatModelPage />)
    expect(container.querySelector('a[href^="/order"]')).not.toBeNull()
    expect(container.textContent).toMatch(/No sample receipt is published/)
  })
})
