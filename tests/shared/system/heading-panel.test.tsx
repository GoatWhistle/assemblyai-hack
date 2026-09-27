import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { Panel, panelTone } from "@/shared/ui/primitives/panel"
import { STATUS_TONE, StatusChip } from "@/shared/ui/primitives/status-chip"
import { Heading, Lede, RANK_FOR_LEVEL } from "@/shared/ui/typography/heading"

const PANEL_SHEET = readFileSync("src/shared/ui/primitives/panel/styles.module.css", "utf8")
const HEADER_SHEET = readFileSync(
  "src/shared/ui/navigation/doc-header/styles.module.css",
  "utf8",
)
const SECTION_SHEET = readFileSync(
  "src/shared/ui/navigation/doc-section/styles.module.css",
  "utf8",
)

describe("Heading", () => {
  it("maps each level to one rank unless the page asks for another", () => {
    render(
      <>
        <Heading level={1}>Measurements</Heading>
        <Heading level={2}>What the gate stops</Heading>
        <Heading level={3}>Catch</Heading>
        <Heading level={2} rank="block">
          Demoted
        </Heading>
        <Lede rank="page">Every figure carries its command.</Lede>
      </>,
    )
    expect(screen.getByRole("heading", { level: 1 }).getAttribute("data-rank")).toBe("page")
    expect(screen.getByText("What the gate stops").getAttribute("data-rank")).toBe("section")
    expect(screen.getByText("Demoted").tagName).toBe("H2")
    expect(screen.getByText("Demoted").getAttribute("data-rank")).toBe("block")
    expect(
      screen.getByText("Every figure carries its command.").getAttribute("data-rank"),
    ).toBe("page")
    expect(RANK_FOR_LEVEL[4]).toBe("block")
  })

  it("shares its role tokens with the docs header and section, so docs and pages match", () => {
    expect(HEADER_SHEET).toMatch(/font-size: var\(--title-page-size\)/)
    expect(SECTION_SHEET).toMatch(/font-size: var\(--title-section-size\)/)
    expect(SECTION_SHEET).toMatch(/gap: var\(--rhythm-group\)/)
  })
})

describe("Panel", () => {
  it("resolves the three tones and keeps the older variants readable", () => {
    expect(panelTone(undefined, undefined)).toBe("default")
    expect(panelTone(undefined, "sunken")).toBe("tinted")
    expect(panelTone("alert", "sunken")).toBe("alert")
  })

  it("flattens a panel placed inside another instead of nesting cards", () => {
    const { container } = render(
      <Panel title="Outer" tone="tinted">
        <Panel title="Inner" headingLevel={3}>
          body
        </Panel>
      </Panel>,
    )
    expect(container.querySelectorAll("[data-panel]")).toHaveLength(2)
    expect(screen.getByRole("heading", { level: 3 }).textContent).toBe("Inner")
    expect(PANEL_SHEET).toMatch(/\.panel \.panel \{[^}]*border: 0;[^}]*\}/)
  })
})

describe("StatusChip", () => {
  it("gives every status exactly one chip tone, with the pair rule on its own tone", () => {
    expect(STATUS_TONE.pair).toBe("lasa")
    expect(STATUS_TONE.asking).not.toBe(STATUS_TONE.pair)
    expect(new Set(Object.values(STATUS_TONE)).size).toBe(Object.keys(STATUS_TONE).length)
    render(<StatusChip status="alert">alert</StatusChip>)
    expect(screen.getByText("alert")).toBeDefined()
  })
})
