import { describe, expect, it } from "vitest"
import { ConfirmationMode, ReasonCode } from "@/domain"
import { ATTACKS, runAttack } from "@/features/attack-console/attacks"

describe("every attack a judge can mount is refused", () => {
  it("offers at least four distinct attacks", () => {
    expect(new Set(ATTACKS.map((attack) => attack.id)).size).toBe(ATTACKS.length)
    expect(ATTACKS.length).toBeGreaterThanOrEqual(4)
  })

  for (const attack of ATTACKS) {
    it(`refuses to write anything for ${attack.id}`, () => {
      const outcome = runAttack(attack.id, ConfirmationMode.ReadBack)
      expect(
        outcome.written,
        `${attack.id} wrote a value; a console that lets one attack through argues against the product`,
      ).toBe(false)
      expect(
        outcome.refusal,
        `${attack.id} refused without saying why, which is no better than a silent failure`,
      ).not.toBeNull()
      expect(String(outcome.refusal).length).toBeGreaterThan(20)
    })
  }

  it("shows the pair check outranking the threshold when the threshold is zero", () => {
    const outcome = runAttack("threshold_to_zero", ConfirmationMode.ReadBack)
    expect(
      outcome.reasonCode,
      "with the threshold at zero, only a check read before the threshold can still refuse",
    ).toBe(ReasonCode.LasaHit)
  })

  it("explains each attack in words a non-programmer can follow", () => {
    for (const attack of ATTACKS) {
      expect(attack.asks.length, `${attack.id} states no attack`).toBeGreaterThan(30)
      expect(attack.explains.length, `${attack.id} states no reason`).toBeGreaterThan(30)
      expect(
        attack.explains.toLowerCase(),
        `${attack.id} explains the refusal in type-system terms rather than in plain words`,
      ).not.toContain("branded")
    }
  })
})
