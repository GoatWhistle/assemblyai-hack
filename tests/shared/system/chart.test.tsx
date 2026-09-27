import { readFileSync } from "node:fs"
import { render, screen, within } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { CompareBars, ShareBar, shareOf } from "@/shared/ui/data-display/chart"

const SHEET = readFileSync("src/shared/ui/data-display/chart/styles.module.css", "utf8")
const TOKENS = readFileSync("src/styles/tokens/system.css", "utf8")

describe("ShareBar", () => {
  it("lists every segment with its count, sized by its share", () => {
    render(
      <ShareBar
        label="How the gate asked"
        segments={[
          { key: "standing", label: "plain read-back", count: 25 },
          { key: "pair", label: "pair rule", count: 21, tone: "lasa" },
          { key: "none", label: "nothing", count: 0 },
        ]}
      />,
    )
    const list = screen.getByRole("list", { name: "How the gate asked" })
    const items = within(list).getAllByRole("listitem")
    expect(items.map((item) => item.getAttribute("data-segment"))).toEqual([
      "standing",
      "pair",
      "none",
    ])
    expect(items[1]?.getAttribute("data-tone")).toBe("lasa")
    expect(items[0]?.style.flexGrow).toBe("25")
    expect(items[2]?.style.flexGrow).toBe("1")
  })
})

describe("CompareBars", () => {
  it("draws each bar on one shared scale and prints the value beside it", () => {
    render(
      <CompareBars
        label="Seeded mishearings written"
        bars={[
          {
            key: "off",
            label: "Pair rule off",
            value: 20,
            max: 20,
            display: "20/20",
            tone: "refused",
          },
          {
            key: "on",
            label: "Pair rule on",
            value: 0,
            max: 20,
            display: "0/20",
            tone: "accepted",
          },
        ]}
      />,
    )
    expect(screen.getByText("20/20")).toBeDefined()
    expect(screen.getByText("0/20")).toBeDefined()
    expect(shareOf(20, 20)).toBe(1)
    expect(shareOf(5, 0)).toBe(0)
    expect(shareOf(30, 20)).toBe(1)
  })

  it("scales with a transform and colours only from semantic chart roles", () => {
    expect(SHEET).toMatch(/transform: scaleX\(var\(--share, 0\)\)/)
    expect(SHEET).not.toMatch(/var\(--(violet|plum|verified|asking|refused)[a-z-]*\)/)
    for (const role of ["threshold", "validator", "lasa", "accepted", "refused"]) {
      expect(TOKENS, role).toMatch(
        new RegExp(String.raw`--chart-${role}-surface: var\(--(reason|verdict)-`),
      )
    }
  })
})
