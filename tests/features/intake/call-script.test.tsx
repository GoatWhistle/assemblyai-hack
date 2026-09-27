import { readFileSync } from "node:fs"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { IntakePrompt } from "@/features/intake/intake-screen/intake-prompt"
import {
  CALL_EXAMPLE_NPI_DIGITS,
  CALL_SCRIPT,
  fillLabel,
} from "@/features/intake/intake-screen/intake-prompt/call-script"

function lines(): HTMLElement[] {
  return within(screen.getByRole("list", { name: "For example" })).getAllByRole("listitem")
}

describe("the example script on the call page shows spoken words becoming fields", () => {
  it("marks the words that become values, and only those", () => {
    render(<IntakePrompt />)
    const marked = [...document.querySelectorAll("mark")].map((node) => node.textContent)
    expect(marked).toEqual([
      "Sam Rivera",
      "Lisinopril",
      "ten milligrams",
      "one two three four five six seven eight nine three",
    ])
  })

  it("names the fields each line fills, in the caller's words rather than pharmacy jargon", () => {
    render(<IntakePrompt />)
    const rows = lines()
    expect(rows).toHaveLength(CALL_SCRIPT.length)
    CALL_SCRIPT.forEach((line, index) => {
      for (const field of line.fills) {
        expect(within(rows[index] as HTMLElement).getByText(fillLabel(field))).toBeDefined()
      }
    })
    expect(fillLabel(FieldName.Sig)).not.toMatch(/\bsig\b/i)
    expect(screen.queryByText(/^sig$/i)).toBeNull()
  })

  it("shows the NPI line resolving to the digits the checksum reads", () => {
    render(<IntakePrompt />)
    const npi = lines().find((row) => /Prescriber NPI/.test(row.textContent ?? ""))
    expect(npi?.textContent).toContain(CALL_EXAMPLE_NPI_DIGITS)
  })

  it("keeps the speaker glyph decorative", () => {
    render(<IntakePrompt />)
    for (const row of lines()) {
      expect(row.querySelector("svg")?.closest("[aria-hidden='true']")).not.toBeNull()
    }
  })

  it("staggers the lines once and lets reduced motion collapse it through the tokens", () => {
    const sheet = readFileSync(
      "src/features/intake/intake-screen/intake-prompt/styles.module.css",
      "utf8",
    )
    expect(sheet).toMatch(/\.line \{[^}]*animation: var\(--keyframes-enter\)[^;]*both/)
    expect(sheet).toMatch(/\.line:nth-child\(3\) \{[^}]*var\(--stagger-step\)/)
    expect(sheet).not.toMatch(/infinite/)
  })
})
