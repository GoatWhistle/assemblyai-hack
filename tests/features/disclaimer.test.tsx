import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DISCLAIMER_BODY, DISCLAIMER_TITLE, Disclaimer } from "@/shared/ui/states/disclaimer"

const PAGES = [
  "app/(pages)/page.tsx",
  "app/(pages)/demo/page.tsx",
  "app/(pages)/metrics/page.tsx",
]

describe("the medical disclaimer", () => {
  it("states that this is not a medical device and that the data is synthetic", () => {
    render(<Disclaimer />)
    expect(screen.getByText(DISCLAIMER_TITLE)).not.toBeNull()
    expect(DISCLAIMER_TITLE).toMatch(/not a medical device/i)
    expect(DISCLAIMER_BODY).toMatch(/synthetic data only/i)
    expect(DISCLAIMER_BODY).toMatch(/no real patients/i)
  })

  it("claims no regulatory approval", () => {
    expect(DISCLAIMER_BODY).toMatch(/not a regulatory approval/i)
  })

  for (const page of PAGES) {
    it(`reaches ${page}, so a judge landing there directly still sees it`, () => {
      const source = readFileSync(page, "utf8")
      const rendersDirectly = /<Disclaimer\s*\/>/.test(source)
      const delegates = /IntakeClient|IntakeScreen/.test(source)
      expect(
        rendersDirectly || delegates,
        `${page} renders neither the disclaimer nor a component that carries it`,
      ).toBe(true)
    })
  }

  it("is rendered by the intake rail, which is what the intake page delegates to", () => {
    const rail = readFileSync("src/features/intake/intake-rail/index.tsx", "utf8")
    expect(
      /DISCLAIMER|Disclaimer/.test(rail),
      "the intake page shows the disclaimer only through the rail",
    ).toBe(true)
  })
})
