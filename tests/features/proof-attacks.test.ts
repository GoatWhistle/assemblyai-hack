import { describe, expect, it } from "vitest"
import { deaScheduleFor, findDrug, loadCatalog, neighbourFor } from "@/catalog"
import { ConfirmationMode, ReasonCode, RULE_CITATIONS } from "@/domain"
import { AttackId, runAttack } from "@/features/attack-console/attacks"
import {
  CATALOG_FACTS,
  MORPHINE,
  REFILLS_HEARD,
  VENORELBINE,
} from "@/features/attack-console/catalog-facts"
import { REFILL_RULE } from "@/validators/schedule"
import { consonantSkeleton } from "@/validators/skeleton"

describe("every fact the console states about the catalogue is the built catalogue's own", () => {
  const index = loadCatalog()

  for (const fact of CATALOG_FACTS) {
    it(`resolves ${fact.heard} the way the console claims`, () => {
      const match = findDrug(index, fact.heard)
      expect(
        match === null ? null : match.drug.nonproprietaryName,
        `the console says ${fact.heard} resolves to ${String(fact.resolvesTo)}; if the rebuilt catalogue disagrees the console is stating a fact it no longer has`,
      ).toBe(fact.resolvesTo)
    })

    it(`carries the DEA schedule the console claims for ${fact.heard}`, () => {
      expect(deaScheduleFor(index, fact.heard)).toBe(fact.deaSchedule)
    })
  }

  it("recovers the name the console names, from the catalogue rather than from a list in the page", () => {
    const neighbour = neighbourFor(index, VENORELBINE.heard)
    expect(neighbour).not.toBeNull()
    expect(neighbour?.skeleton).toBe(VENORELBINE.skeleton)
    expect([...(neighbour?.candidates ?? [])]).toEqual([...VENORELBINE.skeletonNeighbours])
  })

  it("shares one consonant skeleton between the absent name and the recovered one", () => {
    for (const recovered of VENORELBINE.skeletonNeighbours) {
      expect(consonantSkeleton(recovered)).toBe(consonantSkeleton(VENORELBINE.heard))
    }
  })
})

describe("the federal refill prohibition refuses an order that every other check passed", () => {
  it("refuses without a spoken confirmation and names the reason code", () => {
    const outcome = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    expect(outcome.written).toBe(false)
    expect(outcome.reasonCode).toBe(ReasonCode.ValidatorFormat)
  })

  it("cites the federal rule verbatim from the verdict rather than from the page", () => {
    const outcome = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    expect(
      outcome.ruleCited,
      "a citation typed into the interface proves nothing; it has to be the string the validator carries",
    ).toBe(REFILL_RULE)
    expect(outcome.ruleCited).toContain("21 CFR 1306.12(a)")
  })

  it("states the rule in exactly one wording across the codebase", () => {
    expect(
      REFILL_RULE,
      "two paraphrases of one regulation is the claim-diverges-from-code defect we accuse the field of, applied to ourselves",
    ).toBe(RULE_CITATIONS.schedule_refills)
  })

  it("asks about the refills rather than declaring uncertainty about the audio", () => {
    const outcome = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    expect(String(outcome.askedFor)).toContain(String(REFILLS_HEARD))
    expect(String(outcome.askedFor)).toContain("Schedule II")
    expect(
      String(outcome.askedFor).toLowerCase(),
      "this refusal is not about certainty, and saying so would collapse it into the confidence branch",
    ).not.toContain("certain")
  })

  it("refuses a prescription the recognizer heard perfectly", () => {
    const outcome = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    expect(MORPHINE.deaSchedule).toBe("CII")
    expect(REFILLS_HEARD).toBeGreaterThan(0)
    expect(outcome.written).toBe(false)
  })
})

describe("the consonant skeleton names the medicine it recovered", () => {
  it("refuses the absent name with the catalogue reason code", () => {
    const outcome = runAttack(AttackId.ConsonantSkeleton, ConfirmationMode.ReadBack)
    expect(outcome.written).toBe(false)
    expect(outcome.reasonCode).toBe(ReasonCode.ValidatorCatalog)
  })

  it("speaks the recovered name aloud, because a recovery nobody hears cannot be corrected", () => {
    const outcome = runAttack(AttackId.ConsonantSkeleton, ConfirmationMode.ReadBack)
    for (const recovered of VENORELBINE.skeletonNeighbours) {
      expect(
        String(outcome.askedFor),
        "the recovered name lived in the verdict and never reached the caller, so the one-turn correction the mechanism exists for could not happen",
      ).toContain(recovered)
    }
  })

  it("does not claim the recovered name is the right one", () => {
    const outcome = runAttack(AttackId.ConsonantSkeleton, ConfirmationMode.ReadBack)
    const asked = String(outcome.askedFor).toLowerCase()
    expect(asked).toContain("did you mean")
    expect(
      asked,
      "the mechanism recovered 10 of 21 recorded errors; asserting the recovery would overstate a minority result",
    ).not.toContain("you said")
  })
})

describe("the two new attacks do not create a fourth reason to ask", () => {
  it("reports reason codes that already exist for validator failure", () => {
    const schedule = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    const skeleton = runAttack(AttackId.ConsonantSkeleton, ConfirmationMode.ReadBack)
    expect([ReasonCode.ValidatorFormat, ReasonCode.ValidatorCatalog]).toContain(
      schedule.reasonCode,
    )
    expect([ReasonCode.ValidatorFormat, ReasonCode.ValidatorCatalog]).toContain(
      skeleton.reasonCode,
    )
  })

  it("enriches the validator branch rather than bypassing the validator", () => {
    const outcome = runAttack(AttackId.ScheduleRefills, ConfirmationMode.ReadBack)
    expect(outcome.reasonCode).not.toBe(ReasonCode.LowConfidence)
    expect(outcome.reasonCode).not.toBe(ReasonCode.LasaHit)
  })
})
