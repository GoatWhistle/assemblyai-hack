import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("attack console outcome remounts on every attempt", () => {
  it("keys the outcome output by attempt count, so its entrance motion can retrigger", () => {
    const source = readFileSync("src/features/attack-console/index.tsx", "utf8")
    const outputTag = source.match(/<output[^>]*>/)?.[0] ?? ""
    expect(
      outputTag,
      "runAttack is deterministic, so a second click on the same attack renders the same className with no new DOM node; without a key tied to the attempt count, the readback-flag animation plays once and then never again, so 'Attempt again' produces a verdict with no motion confirming the gate actually ran a second time",
    ).toMatch(/key=\{attempt\}/)

    const passedAttempt = source.match(/attempt=\{([^}]*)\}/)?.[1] ?? ""
    expect(
      passedAttempt,
      "the key must be derived from the per-attack attempt counter, not a constant, or every render would still carry the same key and the animation would still never retrigger",
    ).toContain("attempts.get(attack.id)")
  })
})
