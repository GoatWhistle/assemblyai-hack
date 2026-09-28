import CoverPage from "@app/(pages)/cover/page"
import DeckPage, { metadata } from "@app/(pages)/deck/page"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ConfirmationReason, PAIR_RULE_FLAG } from "@/domain"
import { SLIDES } from "@/features/deck"
import { ABSENT, ISMP_FIGURES } from "@/features/deck/figures"
import { DEMO_ARMS } from "@/features/judge-demo/demo-arms"

afterEach(() => {
  cleanup()
})

const RETIRED_MODEL = /(^|[^\w-])universal-3-pro([^\w-]|$)/i
const UNMEASURED_PAIR_TARGET = /(^|[^\w.])240([^\w.]|$)/

const SLIDE_SECTIONS = 'section[aria-labelledby^="slide-"]'

function renderedSlides(): Map<string, string> {
  const { container } = render(<DeckPage />)
  const texts = new Map<string, string>()
  for (const section of container.querySelectorAll(SLIDE_SECTIONS)) {
    const id = section.getAttribute("aria-labelledby")?.replace(/^slide-/, "") ?? ""
    const clone = section.cloneNode(true) as HTMLElement
    for (const count of clone.querySelectorAll("[data-slide-count]")) {
      count.remove()
    }
    texts.set(id, clone.textContent ?? "")
  }
  return texts
}

describe("the printable deck", () => {
  it("renders every slide in order, each with its title", () => {
    const { container } = render(<DeckPage />)
    const headings = screen.getAllByRole("heading", { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(
      SLIDES.map((slide) => slide.title),
    )
    expect(container.querySelectorAll(SLIDE_SECTIONS)).toHaveLength(SLIDES.length)
  })

  it("keeps the deck between ten and twelve slides, opening and closing on the brand field", () => {
    expect(SLIDES.length).toBeGreaterThanOrEqual(10)
    expect(SLIDES.length).toBeLessThanOrEqual(12)
    expect(SLIDES[0]?.tone).toBe("violet")
    expect(SLIDES.at(-1)?.tone).toBe("violet")
  })

  it("numbers every slide between the title and the close as position over total", () => {
    const { container } = render(<DeckPage />)
    const counts = [...container.querySelectorAll("[data-slide-count]")].map(
      (node) => node.textContent,
    )
    const total = String(SLIDES.length).padStart(2, "0")
    expect(
      counts,
      "the title and closing slides carry no number; every slide between shows its position",
    ).toEqual(
      SLIDES.slice(1, -1).map((_, index) => `${String(index + 2).padStart(2, "0")} / ${total}`),
    )
  })

  it("keeps each figure's source in the deck data rather than printing it on the slide", () => {
    render(<DeckPage />)
    expect(screen.queryAllByText(/^Source: /)).toHaveLength(0)
    expect(SLIDES.filter((slide) => slide.source !== undefined).length).toBeGreaterThan(0)
  })

  it("gives slides unique ids so print pages cannot collide", () => {
    expect(new Set(SLIDES.map((slide) => slide.id)).size).toBe(SLIDES.length)
  })

  it("is kept out of search indexes", () => {
    expect(metadata.robots).toEqual({ index: false })
  })
})

describe("the deck is honest about its numbers", () => {
  it("carries no digit on a slide that names no source", () => {
    const texts = renderedSlides()
    const unsourced = SLIDES.filter(
      (slide) => /\d/.test(texts.get(slide.id) ?? "") && slide.source === undefined,
    ).map((slide) => slide.id)
    expect(
      unsourced,
      "a figure without its command or document is the thing eval/REPORT.md forbids; drop the figure, not the slide",
    ).toEqual([])
  })

  it("never quotes the unmeasured pair target or the retired model", () => {
    const texts = renderedSlides()
    const offending = [...texts].filter(
      ([, text]) => UNMEASURED_PAIR_TARGET.test(text) || RETIRED_MODEL.test(text),
    )
    expect(
      offending.map(([id]) => id),
      "about 240 pairs was a design target never measured, and universal-3-pro was retired on 2 September 2026",
    ).toEqual([])
  })

  it("keeps the cover free of the same two tokens", () => {
    const { container } = render(<CoverPage />)
    const text = container.textContent ?? ""
    expect(UNMEASURED_PAIR_TARGET.test(text)).toBe(false)
    expect(RETIRED_MODEL.test(text)).toBe(false)
  })

  it("states the ISMP pair count from the measured row rather than from memory", () => {
    const rule = renderedSlides().get("rule") ?? ""
    expect(rule).toContain(ISMP_FIGURES.pairs)
    expect(ISMP_FIGURES.pairs).not.toBe(ABSENT)
  })

  it("closes on the medical disclaimer, since the printed deck carries no page footer", () => {
    const closing = renderedSlides().get(SLIDES.at(-1)?.id ?? "") ?? ""
    expect(closing).toContain("not a medical device")
    expect(closing).toContain("Synthetic data only")
  })

  it("marks the staged mishearing as staged where the certainty is read", () => {
    const failure = renderedSlides().get("failure") ?? ""
    expect(failure).toContain("staged example")
    expect(failure).toContain("certainty 1.00")
  })

  it("the guards themselves catch what they exist to catch", () => {
    expect(UNMEASURED_PAIR_TARGET.test("about 240 pairs")).toBe(true)
    expect(UNMEASURED_PAIR_TARGET.test("2400 rows or 0.240")).toBe(false)
    expect(RETIRED_MODEL.test("pinned universal-3-pro here")).toBe(true)
    expect(RETIRED_MODEL.test("universal-3-5-pro")).toBe(false)
  })
})

describe("the demo slide describes the arms the replay actually runs", () => {
  it("quotes each arm's own agent line and answer, not a paraphrase", () => {
    const text = renderedSlides().get("demo") ?? ""
    for (const arm of DEMO_ARMS) {
      const question = arm.agentLine.includes("Which:")
        ? arm.agentLine.slice(arm.agentLine.indexOf("Which:"))
        : arm.agentLine
      expect(text).toContain(question)
      expect(text).toContain(arm.answer.callerSaid)
    }
  })

  it("names the single flag the arms differ by and calls the case synthesised", () => {
    const text = renderedSlides().get("demo") ?? ""
    expect(text).toContain(`one policy flag, ${PAIR_RULE_FLAG}`)
    expect(text).toContain("synthesised")
    expect(text).toContain(ConfirmationReason.LasaNamedAnswerRequired)
  })
})
