import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const BUTTON = "src/shared/ui/primitives/button/styles.module.css"
const ACTION_LINK = "src/shared/ui/primitives/action-link/styles.module.css"

function coarseBlock(file: string): string {
  const source = readFileSync(file, "utf8")
  const at = source.indexOf("@media (pointer: coarse)")
  expect(
    at,
    `${file} declares no coarse-pointer block, so its small variant stays under the touch floor on the only devices where the floor matters; make touch-targets passes because the sheet mentions the token elsewhere`,
  ).toBeGreaterThan(-1)
  return source.slice(at)
}

describe("a small control still clears the touch floor where a finger is the pointer", () => {
  it("raises the small button under a coarse pointer", () => {
    expect(
      coarseBlock(BUTTON),
      "the seven attack buttons render 28px tall on a fine pointer; on a phone they have to be reachable",
    ).toContain("var(--target-touch)")
  })

  it("raises the small action link under a coarse pointer, as the button already did", () => {
    expect(
      coarseBlock(ACTION_LINK),
      "the demo script's step links are size small; without this the link was 28px on touch while the button beside it was 44px, and no ratchet caught the difference",
    ).toContain("var(--target-touch)")
  })

  it("names the token rather than a raw 44, which is how this rule drifted before", () => {
    for (const file of [BUTTON, ACTION_LINK]) {
      const block = coarseBlock(file)
      expect(
        /min-height:\s*44px/.test(block),
        `${file} hardcodes the floor; three places had the value as a raw number and that is exactly why the rule diverged twice`,
      ).toBe(false)
    }
  })

  it("keeps the two primitives at the same floor, so one cannot quietly fall behind again", () => {
    const counts = [BUTTON, ACTION_LINK].map(
      (file) => coarseBlock(file).match(/var\(--target-touch\)/g)?.length ?? 0,
    )
    expect(
      counts[0],
      "a link and a button sitting side by side must be equally hittable; the defect found in the browser was exactly this asymmetry",
    ).toBe(counts[1])
  })
})
