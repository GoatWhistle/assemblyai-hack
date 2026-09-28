import { readFileSync } from "node:fs"
import GlossaryPage from "@app/(pages)/(docs)/docs/glossary/page"
import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { GLOSSARY, glossaryAnchor } from "@/features/how-it-works/glossary/terms"

const SHEET = readFileSync("app/(pages)/(docs)/docs/glossary/styles.module.css", "utf8")

afterEach(() => {
  cleanup()
})

describe("the glossary", () => {
  it("gives every term a row a link can land on, with the definition word for word", () => {
    const { container } = render(<GlossaryPage />)
    for (const entry of GLOSSARY) {
      const row = container.querySelector(`#${glossaryAnchor(entry.term)}`)
      expect(row?.tagName, entry.term).toBe("TR")
      expect(row?.querySelector('[data-column="definition"]')?.textContent).toBe(
        entry.definition,
      )
    }
  })

  it("sets reason codes as code, the way every other page prints them", () => {
    const { container } = render(<GlossaryPage />)
    const codes = [...container.querySelectorAll('section[aria-label="Terms"] code')].map(
      (node) => node.textContent,
    )
    expect(codes).toEqual(
      expect.arrayContaining([
        "E_LOW_CONFIDENCE",
        "E_READ_BACK_REQUIRED",
        "E_LASA_HIT",
        "A_",
        "C_",
        "E_",
      ]),
    )
    expect(codes.every((code) => /^[ACE]_[A-Z_]*$/.test(code ?? ""))).toBe(true)
  })

  it("keeps the term a link landed on marked for as long as it is the target", () => {
    expect(SHEET).toMatch(/\.terms tr:target \{\s*background-color: var\(--select-surface\);/)
    expect(SHEET).toMatch(/\.terms tr:target th \{\s*color: var\(--select-ink\);/)
  })
})
