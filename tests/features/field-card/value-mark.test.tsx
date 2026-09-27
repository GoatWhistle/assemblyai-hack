import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { makeWordSpan } from "@/domain"
import { FieldCard } from "@/features/field-card"
import { type FieldStance, STANCE_MARK } from "@/features/field-card/field-status"
import { landingSide } from "@/features/gate-banner/contrast-question"
import { LASA_CANDIDATE, LASA_DECISION } from "@/features/judge-demo/scenario"
import { settledCard } from "@/features/judge-demo/settled-card"
import { traceOrder } from "@/features/transcript-view/transcript-line"
import { TRACE_CAP } from "@/shared/ui/data-display/word-span-strip"

function cardOf(label: string): HTMLElement {
  return screen.getByRole("article", { name: `${label} field card` })
}

describe("the gate decision reads differently for a written value and a held one", () => {
  it("marks every stance that writes the value as written and every re-ask as held", () => {
    const written: FieldStance[] = ["accepted", "confirmed"]
    const held: FieldStance[] = ["asking", "refused", "lasa", "escalated"]
    for (const stance of written) {
      expect(STANCE_MARK[stance], stance).toBe("written")
    }
    for (const stance of held) {
      expect(STANCE_MARK[stance], stance).toMatch(/^held/)
    }
    expect(STANCE_MARK.proposed).toBeNull()
  })

  it("holds a look-alike name at certainty 1.00 instead of writing it", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    expect(LASA_CANDIDATE.provenance.minConfidence).toBe(1)
    expect(cardOf("Drug name").dataset.mark).toBe("heldLasa")
  })

  it("writes the name only once the caller said it aloud", () => {
    const settled = settledCard("settled", LASA_DECISION)
    render(
      <FieldCard
        candidate={settled.candidate}
        decision={settled.decision}
        evidence={settled.evidence}
        siblings={settled.siblings}
      />,
    )
    expect(cardOf("Drug name").dataset.mark).toBe("written")
  })

  it("links the traced words to the value by the number of words, capped", () => {
    render(<FieldCard candidate={LASA_CANDIDATE} decision={LASA_DECISION} />)
    const words = cardOf("Drug name").style.getPropertyValue("--trace-words")
    expect(Number(words)).toBe(Math.min(LASA_CANDIDATE.provenance.words.length, TRACE_CAP))
  })
})

describe("the source words light up in the order they were spoken", () => {
  it("ranks only the selected words, from the first spoken, and caps the stagger", () => {
    const words = Array.from({ length: 14 }, (_, index) =>
      makeWordSpan({
        text: `w${index}`,
        startMs: 1000 + index * 100,
        endMs: 1080 + index * 100,
        confidence: 1,
      }),
    )
    const order = traceOrder(words, { startMs: 1200, endMs: 2680 })
    expect(order.has(1000)).toBe(false)
    expect(order.get(1200)).toBe(0)
    expect(order.get(1300)).toBe(1)
    expect(order.get(2300)).toBe(TRACE_CAP)
    expect(traceOrder(words, null).size).toBe(0)
  })

  it("lands the two listed names from opposite sides so they read as a pair", () => {
    expect(landingSide(0, 2)).toBe("-0.5rem")
    expect(landingSide(1, 2)).toBe("0.5rem")
    expect(landingSide(1, 3)).toBe("0")
    expect(landingSide(0, 1)).toBe("0")
  })

  it("collapses the trace stagger to nothing under reduced motion", () => {
    const motion = readFileSync("src/styles/tokens/motion.css", "utf8")
    const reduced = motion.slice(motion.indexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toContain("--stagger-trace: 0ms;")
  })
})
