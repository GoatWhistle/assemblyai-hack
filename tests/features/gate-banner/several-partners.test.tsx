import { cleanup, render, within } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { policyFor, ReasonCode } from "@/domain"
import { Compare, MOMENTS, partnersNote } from "@/features/compare"
import { FieldCard } from "@/features/field-card"
import { GateBanner } from "@/features/gate-banner"
import { spokenChoice } from "@/features/gate-banner/contrast-question"
import { NAMED_CANDIDATE } from "@/features/judge-demo/scenario"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"

afterEach(() => {
  cleanup()
})

const DECISION = decide(NAMED_CANDIDATE, policyFor(NAMED_CANDIDATE.field))
const PARTNERS = NAMED_CANDIDATE.lasa.confusableWith

function titled(name: string): string {
  return `${name.charAt(0).toUpperCase()}${name.slice(1).toLowerCase()}`
}

describe("a name with several listed partners shows every one of them", () => {
  it("is a real case on the full ISMP list, not a planted one", () => {
    expect(DECISION.reasonCode).toBe(ReasonCode.LasaHit)
    expect(PARTNERS.length).toBeGreaterThan(2)
    expect(PARTNERS).toEqual(lasaRiskFor("hydromorphone").confusableWith)
  })

  it("puts every partner into the banner's contrastive question", () => {
    const { container } = render(<GateBanner decision={DECISION} candidate={NAMED_CANDIDATE} />)
    const question = container.querySelector("output")?.textContent ?? ""
    for (const partner of PARTNERS) {
      expect(question, `${partner} is missing from the question`).toContain(titled(partner))
    }
    expect(question).toContain(`${PARTNERS.length + 1} names on the published list`)
  })

  it("puts a chip for every partner on the field card", () => {
    const { container } = render(<FieldCard candidate={NAMED_CANDIDATE} decision={DECISION} />)
    for (const partner of PARTNERS) {
      expect(within(container).getAllByText(partner).length).toBeGreaterThan(0)
    }
  })

  it("lists every partner beside a pair hit in the compare table", () => {
    const paired = MOMENTS.filter((moment) => moment.decision.reasonCode === ReasonCode.LasaHit)
    expect(paired.length).toBeGreaterThan(0)
    const { container } = render(<Compare />)
    for (const moment of paired) {
      expect(moment.partners).toEqual(moment.candidate.lasa.confusableWith)
      const row = container.querySelector(`tr[data-moment="${moment.id}"]`)
      expect(row?.textContent).toContain(partnersNote(moment.partners))
    }
  })

  it("reads a long choice as a list and a short one as a plain or", () => {
    expect(spokenChoice(["Morphine", "Hydromorphone"])).toBe("Morphine or Hydromorphone")
    expect(spokenChoice(["A", "B", "C"])).toBe("A, B or C")
    expect(spokenChoice(["A"])).toBe("A")
  })
})
