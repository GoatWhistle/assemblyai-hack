import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { KeytermsAb } from "@/features/judge-demo/keyterms-ab"
import {
  CIRCULARITY,
  KEYTERMS_ARMS,
  KEYTERMS_BUDGET,
  keytermsArmFor,
  lasaTermsInside,
  PHRASE_WINDOW,
  SAMPLE_SIZE,
  WHY_NO_NUMBER,
} from "@/features/judge-demo/keyterms-ab/arms"
import { buildKeyterms, LASA_PAIRS, lasaCheckedTerms, normalizeTerm } from "@/lasa"

describe("the keyterms A/B offers only the arm that may be run", () => {
  it("marks the shipped arm runnable and the biased arm not", () => {
    expect(
      keytermsArmFor("shipped").runnable,
      "the identity-context list is what every measured run used, so it is the arm a reader may reproduce",
    ).toBe(true)
    expect(
      keytermsArmFor("biased").runnable,
      "a runnable biased arm would make a pair member as a recognizer hint into a product option, which is the configuration the purity rule forbids outright",
    ).toBe(false)
  })

  it("gives the biased arm a stated reason for having no switch", () => {
    const biased = keytermsArmFor("biased")
    expect(
      biased.whyNotRunnable,
      "an arm that is simply missing reads as an oversight; the refusal has to name itself",
    ).not.toBeNull()
    expect(String(biased.whyNotRunnable)).toContain("purity test")
  })

  it("gives the shipped arm no such reason, so the field is not decorative", () => {
    expect(
      keytermsArmFor("shipped").whyNotRunnable,
      "if both arms carried a refusal note the field would stop distinguishing them",
    ).toBeNull()
  })

  it("exposes exactly two arms, so the page cannot quietly grow a third configuration", () => {
    expect(KEYTERMS_ARMS.map((arm) => arm.id)).toEqual(["shipped", "biased"])
  })

  it("refuses an unknown arm rather than rendering an empty one", () => {
    expect(() => keytermsArmFor("threshold" as "shipped")).toThrow(RangeError)
  })
})

describe("the shipped arm is read off the real list, not described", () => {
  it("samples the list the deployment actually builds", () => {
    const arm = keytermsArmFor("shipped")
    const real = buildKeyterms()
    expect(
      arm.sample,
      "a hand-typed sample would drift from the list the recognizer receives, and the page would be claiming a configuration it does not send",
    ).toEqual(real.slice(0, SAMPLE_SIZE))
    expect(arm.termCount, "the count must be the built list's own length").toBe(real.length)
  })

  it("finds no published pair member inside the shipped list", () => {
    expect(
      keytermsArmFor("shipped").lasaTermsPresent,
      "this is the same property tests/lasa/keyterms-purity.test.ts asserts; the page recomputes it so a reader sees the check rather than a claim about it",
    ).toEqual([])
  })

  it("stays inside the declared keyterms budget", () => {
    expect(keytermsArmFor("shipped").termCount).toBeLessThanOrEqual(KEYTERMS_BUDGET)
  })
})

describe("the biased arm is drawn from the curated pair table", () => {
  it("takes its sample from the table rather than from a copied list", () => {
    const arm = keytermsArmFor("biased")
    const tableTerms = new Set(
      LASA_PAIRS.flatMap((pair) => [normalizeTerm(pair.termA), normalizeTerm(pair.termB)]),
    )
    for (const term of arm.sample) {
      expect(
        tableTerms.has(normalizeTerm(term)),
        `${term} is shown as a biased keyterm but is not on the curated pair table, so the illustration would not track the table it claims to come from`,
      ).toBe(true)
    }
  })

  it("detects every one of its own sample terms as a pair member", () => {
    const arm = keytermsArmFor("biased")
    expect(
      arm.lasaTermsPresent.length,
      "if the detector found nothing in a list built from the pair table, the detector would be the thing that is broken",
    ).toBe(arm.sample.length)
  })
})

describe("the pair-member detector is the mechanism, not a label", () => {
  it("finds a pair member standing alone", () => {
    const [first] = LASA_PAIRS
    expect(lasaTermsInside([String(first?.termA)]).length).toBe(1)
  })

  it("finds a pair member hidden inside a longer phrase", () => {
    const [first] = LASA_PAIRS
    expect(
      lasaTermsInside([`dispense ${String(first?.termA)} please`]).length,
      "a multiword keyterm that contains a pair member biases the recognizer just as a bare one does",
    ).toBe(1)
  })

  it("scans phrases at least two tokens wide, so a two-word pair name could not slip through", () => {
    expect(
      PHRASE_WINDOW,
      "the curated table holds only single-word names today, so a one-token scan passes every test the table can currently write while silently failing the moment a two-word name is curated. The window is the guarantee, and narrowing it has to break something by name.",
    ).toBeGreaterThanOrEqual(2)
  })

  it("generates the two-token phrase, proving the wider window is wired and not decorative", () => {
    const tokens = "dispense insulin glargine tonight".split(" ")
    const windows: string[] = []
    for (let size = 1; size <= PHRASE_WINDOW; size += 1) {
      for (let index = 0; index + size <= tokens.length; index += 1) {
        windows.push(tokens.slice(index, index + size).join(" "))
      }
    }
    expect(
      windows,
      "a loop that only ever produced single tokens would pass every test the curated table can currently write, because no pair name has two words yet",
    ).toContain("insulin glargine")
  })

  it("finds nothing in identity context", () => {
    expect(lasaTermsInside(["Mercy Family Clinic", "milligrams", "by mouth"])).toEqual([])
  })

  it("agrees with the curated table over every pair, in both directions", () => {
    const checked = lasaCheckedTerms()
    for (const pair of LASA_PAIRS) {
      for (const term of [pair.termA, pair.termB]) {
        expect(
          lasaTermsInside([term]).length,
          `${term} is on the curated table and must be recognised as a forbidden keyterm; a detector that misses one direction of a pair leaves that half unguarded`,
        ).toBe(1)
        expect(checked.has(normalizeTerm(term))).toBe(true)
      }
    }
  })
})

describe("what the page tells a reader", () => {
  it("names the circularity rather than only calling the arm worse", async () => {
    render(<KeytermsAb />)
    expect(screen.getByText(CIRCULARITY)).toBeDefined()
  })

  it("shows the shipped arm first, so the default is the configuration we ship", () => {
    render(<KeytermsAb />)
    const tabs = screen.getAllByRole("tab")
    expect(tabs[0]?.getAttribute("aria-selected")).toBe("true")
    expect(screen.getByText(/identity context only/i)).toBeDefined()
  })

  it("switches to the biased arm and states there it is never run", async () => {
    render(<KeytermsAb />)
    await userEvent.click(screen.getByRole("tab", { name: /Biased list/i }))
    expect(screen.getByText(/Why this arm has no switch/i)).toBeDefined()
    expect(screen.getAllByText(/described, never run/i).length).toBeGreaterThan(0)
  })

  it("publishes no figure for the biased arm and says why not", async () => {
    render(<KeytermsAb />)
    await userEvent.click(screen.getByRole("tab", { name: /Biased list/i }))
    expect(
      screen.getByText(WHY_NO_NUMBER),
      "the biased arm has never been measured, and printing a number there would be exactly the invented figure the project forbids",
    ).toBeDefined()
    expect(screen.getAllByText(/not observed yet/i).length).toBeGreaterThan(0)
  })

  it("remounts the panel on a switch, so the enter animation is not dead on arrival", async () => {
    const { container } = render(<KeytermsAb />)
    const before = container.querySelector('[role="tabpanel"]')
    await userEvent.click(screen.getByRole("tab", { name: /Biased list/i }))
    const after = container.querySelector('[role="tabpanel"]')
    expect(
      after === before,
      "the panel declares an enter animation, and a node React reuses across switches never replays it. Measured in a browser, the animation did not run at all until the panel was keyed; CSS is stubbed here, so this asserts the remount that makes the animation possible.",
    ).toBe(false)
  })

  it("says the comparison opens no socket, so a reader knows it costs nothing", () => {
    render(<KeytermsAb />)
    expect(screen.getByText(/costs no credit and needs no microphone/i)).toBeDefined()
  })

  it("never presents the biased arm as a setting a reader could enable", async () => {
    render(<KeytermsAb />)
    await userEvent.click(screen.getByRole("tab", { name: /Biased list/i }))
    for (const forbidden of [
      /enable/i,
      /turn it on/i,
      /try this configuration/i,
      /switch it on/i,
    ]) {
      expect(
        screen.queryByText(forbidden),
        "wording that invites a reader to run the biased arm would make it a product option, which is the whole thing this section refuses",
      ).toBeNull()
    }
  })
})
