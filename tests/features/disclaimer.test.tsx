import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import {
  DISCLAIMER_AFFILIATION,
  DISCLAIMER_BODY,
  DISCLAIMER_NO_REAL_DATA,
  DISCLAIMER_TITLE,
  Disclaimer,
} from "@/shared/ui/states/disclaimer"

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

  it("is rendered by the intake screen itself, not by a panel that appears mid-session", () => {
    const screenSource = readFileSync("src/features/intake/intake-screen/index.tsx", "utf8")
    expect(
      /<Disclaimer\s*\/>/.test(screenSource),
      "the intake screen must render the disclaimer directly; putting it in the rail hid it until a session had started, which is exactly when a judge has not started one",
    ).toBe(true)

    const rail = readFileSync("src/features/intake/intake-rail/index.tsx", "utf8")
    expect(/<Disclaimer\s*\/>/.test(rail), "the rail must not render a second copy").toBe(false)
  })
})

describe("the two parts a reader could mistake us for claiming", () => {
  it("denies affiliation with every body it cites", () => {
    render(<Disclaimer />)
    expect(screen.getByText(DISCLAIMER_AFFILIATION)).not.toBeNull()
    for (const body of ["ISMP", "FDA", "Joint Commission", "21 CFR"]) {
      expect(
        DISCLAIMER_AFFILIATION,
        `this project quotes ${body} as evidence that read-back is already required; quoting a regulator without denying affiliation invites a reader to think the software was reviewed by one`,
      ).toContain(body)
    }
    expect(DISCLAIMER_AFFILIATION).toMatch(/not affiliated with, endorsed by, or reviewed by/i)
  })

  it("tells the reader not to enter real patient data", () => {
    render(<Disclaimer />)
    expect(
      screen.getByText(DISCLAIMER_NO_REAL_DATA),
      "a medical-looking intake form invites real data, and the honest instruction is an instruction rather than an implication of the word synthetic",
    ).not.toBeNull()
    expect(DISCLAIMER_NO_REAL_DATA).toMatch(/do not enter real patient data/i)
  })
})
