import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { threeStratumRows } from "../../scripts/measure/analyse-rarity"

type Scored = {
  readonly spoken: string
  readonly correct: boolean
  readonly minConfidence: number
}
type Result = { readonly scored: readonly Scored[] }

const HELDOUT_RESULT = "eval/heldout/result-plain.json"

function heldoutScored(): readonly Scored[] | null {
  if (!existsSync(HELDOUT_RESULT)) {
    return null
  }
  return (JSON.parse(readFileSync(HELDOUT_RESULT, "utf8")) as Result).scored
}

describe("the pre-registered three-stratum table has a command that reproduces it", () => {
  it("reproduces the exact rare/mid/common figures eval/REPORT.md publishes", () => {
    const scored = heldoutScored()
    if (scored === null) {
      return
    }
    const rows = threeStratumRows(scored)
    expect(
      rows.map((r) => [r.n, r.errors, r.interval.low, r.interval.high]),
      "the held-out run in eval/REPORT.md reports 20/6, 20/6, 20/4 for rare, mid, common; a stale copy would drift from this the next time the set is scored",
    ).toEqual([
      [20, 6, expect.closeTo(0.145, 2), expect.closeTo(0.519, 2)],
      [20, 6, expect.closeTo(0.145, 2), expect.closeTo(0.519, 2)],
      [20, 4, expect.closeTo(0.081, 2), expect.closeTo(0.416, 2)],
    ])
  })

  it("orders items rare, mid, common by position, matching how build-heldout-set.ts draws them", () => {
    const scored = heldoutScored()
    if (scored === null) {
      return
    }
    const rows = threeStratumRows(scored)
    expect(rows.map((r) => r.label)).toEqual([
      "rare, at most one catalogue combination",
      "mid, two to four",
      "common, five or more",
    ])
  })

  it("refuses a set that was not drawn 20 per stratum rather than silently misreading it", () => {
    const wrongSize = Array.from({ length: 40 }, () => ({
      spoken: "x",
      correct: true,
      minConfidence: 1,
    }))
    expect(
      () => threeStratumRows(wrongSize),
      "a set of the wrong size is not rare/mid/common at all; printing a table anyway would attach the pre-registered stratum names to items that were never drawn that way",
    ).toThrow(/three-stratum table assumes/)
  })
})
