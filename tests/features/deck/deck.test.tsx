import CoverPage from "@app/(pages)/cover/page"
import DeckPage, { metadata } from "@app/(pages)/deck/page"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"
import { ConfirmationReason, PAIR_RULE_FLAG } from "@/domain"
import { SLIDES } from "@/features/deck"
import { DEMO_ARMS } from "@/features/judge-demo/demo-arms"
import { LASA_PAIRS } from "@/lasa"

afterEach(() => {
  cleanup()
})

const RETIRED_MODEL = /(^|[^\w-])universal-3-pro([^\w-]|$)/i
const UNMEASURED_PAIR_TARGET = /(^|[^\w.])240([^\w.]|$)/

function slideText(slide: (typeof SLIDES)[number]): string {
  return [slide.title, ...slide.body, slide.source ?? ""].join("\n")
}

describe("the printable deck", () => {
  it("renders every slide from the data in order, each with its title", () => {
    render(<DeckPage />)
    const headings = screen.getAllByRole("heading", { level: 2 })
    expect(headings.map((heading) => heading.textContent)).toEqual(
      SLIDES.map((slide) => slide.title),
    )
    const sections = screen.getAllByRole("region")
    expect(sections).toHaveLength(SLIDES.length)
  })

  it("prints each slide's source beside its figures", () => {
    render(<DeckPage />)
    const sourced = SLIDES.filter((slide) => slide.source !== undefined)
    expect(screen.getAllByText(/^Source: /)).toHaveLength(sourced.length)
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
    const unsourced = SLIDES.filter(
      (slide) =>
        /\d/.test([slide.title, ...slide.body].join(" ")) &&
        (slide.source === undefined || slide.source.trim() === ""),
    ).map((slide) => slide.id)
    expect(
      unsourced,
      "a figure without its command or document is the thing eval/REPORT.md forbids; drop the figure, not the slide",
    ).toEqual([])
  })

  it("never quotes the unmeasured pair target or the retired model", () => {
    const offending = SLIDES.filter(
      (slide) =>
        UNMEASURED_PAIR_TARGET.test(slideText(slide)) || RETIRED_MODEL.test(slideText(slide)),
    ).map((slide) => slide.id)
    expect(
      offending,
      "about 240 pairs was a design target never measured, and universal-3-pro was retired on 2 September 2026",
    ).toEqual([])
  })

  it("keeps the cover free of the same two tokens", () => {
    const { container } = render(<CoverPage />)
    const text = container.textContent ?? ""
    expect(UNMEASURED_PAIR_TARGET.test(text)).toBe(false)
    expect(RETIRED_MODEL.test(text)).toBe(false)
  })

  it("states the pair count from the curated table rather than from memory", () => {
    const limits = SLIDES.find((slide) => slide.id === "limitations")
    expect(limits?.body.join(" ")).toContain(`${LASA_PAIRS.length} curated pairs`)
  })

  it("the guards themselves catch what they exist to catch", () => {
    expect(UNMEASURED_PAIR_TARGET.test("about 240 pairs")).toBe(true)
    expect(UNMEASURED_PAIR_TARGET.test("2400 rows or 0.240")).toBe(false)
    expect(RETIRED_MODEL.test("pinned universal-3-pro here")).toBe(true)
    expect(RETIRED_MODEL.test("universal-3-5-pro")).toBe(false)
  })
})

describe("the demo slide describes the arms the replay actually runs", () => {
  const demo = SLIDES.find((slide) => slide.id === "demo")
  const text = demo === undefined ? "" : slideText(demo)

  it("quotes each arm's own agent line, not a paraphrase", () => {
    for (const arm of DEMO_ARMS) {
      const question = arm.agentLine.includes("Which:")
        ? arm.agentLine.slice(arm.agentLine.indexOf("Which:"))
        : arm.agentLine
      expect(text).toContain(question)
    }
  })

  it("names the single flag the arms differ by and calls the case synthesised", () => {
    expect(text).toContain(`one policy flag, ${PAIR_RULE_FLAG}`)
    expect(text).toContain("synthesised")
    expect(text).toContain(ConfirmationReason.LasaNamedAnswerRequired)
  })
})
