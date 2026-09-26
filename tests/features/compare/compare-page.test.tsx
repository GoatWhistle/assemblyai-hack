import ComparePage, { metadata } from "@app/(pages)/(docs)/compare/page"
import DocsLayout from "@app/(pages)/(docs)/layout"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { GateAction, policyFor, ReasonCode } from "@/domain"
import {
  COLUMN,
  formatCertainty,
  GateVerdict,
  MOMENTS,
  PAIR_OUTRANKS_NOTE,
  thresholdOnly,
  verdictFor,
} from "@/features/compare"
import { decide } from "@/gate"
import { DISCLAIMER_TITLE } from "@/shared/ui/states/disclaimer"

vi.mock("next/navigation", () => ({ usePathname: () => "/compare" }))

function rows(container: HTMLElement): HTMLTableRowElement[] {
  return [...container.querySelectorAll<HTMLTableRowElement>("tbody tr[data-moment]")]
}

function rowFor(container: HTMLElement, id: string): HTMLTableRowElement {
  const row = container.querySelector<HTMLTableRowElement>(`tbody tr[data-moment="${id}"]`)
  if (row === null) {
    throw new Error(`no row for ${id}`)
  }
  return row
}

describe("the compare page", () => {
  it("renders exactly six moments, one row each", () => {
    const { container } = render(<ComparePage />)
    expect(MOMENTS.length).toBe(6)
    expect(rows(container).length).toBe(6)
  })

  it("carries metadata, and the docs layout around it carries the site header and the disclaimer", () => {
    render(
      <DocsLayout>
        <ComparePage />
      </DocsLayout>,
    )
    expect(metadata.title).toBe("Compare")
    expect(screen.getByRole("banner")).toBeDefined()
    expect(screen.getByText(DISCLAIMER_TITLE)).toBeDefined()
  })

  it("names every column the brief asks for", () => {
    render(<ComparePage />)
    for (const label of Object.values(COLUMN)) {
      expect(screen.getByRole("columnheader", { name: label })).toBeDefined()
    }
  })

  it("shows in every row the verdict and reason code decide() computes for it", () => {
    const { container } = render(<ComparePage />)
    for (const moment of MOMENTS) {
      const raised = decide(moment.candidate, policyFor(moment.candidate.field))
      expect(moment.decision, `${moment.id} shows a verdict nothing computed`).toEqual(raised)
      const row = within(rowFor(container, moment.id))
      const verdictCell = rowFor(container, moment.id).querySelector<HTMLElement>(
        '[data-label="Gate verdict"]',
      )
      expect(verdictCell, `${moment.id} has no verdict cell`).not.toBeNull()
      expect(row.getByText(verdictFor(raised))).toBeDefined()
      expect(within(verdictCell as HTMLElement).getByText(raised.reasonCode)).toBeDefined()
      expect(
        row.getByText(formatCertainty(moment.candidate.provenance.minConfidence)),
      ).toBeDefined()
    }
  })

  it("computes the ungated column from the same candidate with the pair check and read-back off", () => {
    for (const moment of MOMENTS) {
      const baseline = decide(
        moment.candidate,
        thresholdOnly(policyFor(moment.candidate.field)),
      )
      expect(moment.withoutGate).toEqual(baseline)
      expect(moment.withoutGateWrites).toBe(baseline.action === GateAction.Accept)
    }
  })

  it("re-asks on the look-alike row at certainty 1.00 with the pair reason code", () => {
    const { container } = render(<ComparePage />)
    const lasa = MOMENTS.find((moment) => moment.heard === "morphine")
    expect(lasa, "the page lost the moment it exists for").toBeDefined()
    const row = within(rowFor(container, lasa?.id ?? ""))
    expect(row.getByText(GateVerdict.ReAsk)).toBeDefined()
    expect(row.getAllByText(ReasonCode.LasaHit).length).toBeGreaterThan(0)
    expect(row.getByText("certainty 1.00")).toBeDefined()
    expect(row.getByText(PAIR_OUTRANKS_NOTE)).toBeDefined()
    expect(row.getByText("Written: morphine")).toBeDefined()
  })

  it("covers a pass, so the page does not read as an agent that refuses everything", () => {
    expect(MOMENTS.some((moment) => moment.verdict === GateVerdict.Pass)).toBe(true)
  })

  it("never renders certainty as a percentage", () => {
    const { container } = render(<ComparePage />)
    for (const row of rows(container)) {
      expect(row.textContent ?? "").not.toMatch(/certainty[^|]*%/i)
    }
  })

  it("r1-A5-09: labels the last column as what it is, a threshold with the validators still on", () => {
    render(<ComparePage />)
    expect(
      screen.getByRole("columnheader", { name: "Threshold and validators only" }),
    ).toBeDefined()
    expect(screen.queryByRole("columnheader", { name: "Without the gate" })).toBeNull()
  })

  it("r1-A3-10: never lets a reason code break mid-token", () => {
    const { container } = render(<ComparePage />)
    expect(container.querySelector("wbr")).toBeNull()
  })

  it("says the candidates are synthesised rather than recorded live", () => {
    render(<ComparePage />)
    expect(screen.getByText(/synthesised from the documented message shapes/i)).toBeDefined()
  })
})
