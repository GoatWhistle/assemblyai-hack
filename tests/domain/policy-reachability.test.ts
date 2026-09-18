import { describe, expect, it } from "vitest"
import { Criticality, FieldName } from "@/domain"
import { FIELD_POLICIES, policyFor } from "@/domain/policy"
import { lasaCheckedTerms } from "@/lasa"

describe("every policy flag that is on must be reachable", () => {
  it("only sets lasaChecked on fields whose values the pair table can actually match", () => {
    const terms = lasaCheckedTerms()
    const flagged = [...FIELD_POLICIES.values()]
      .filter((policy) => policy.lasaChecked)
      .map((p) => p.field)

    expect(flagged, "drugName is the field the pair table indexes").toContain(
      FieldName.DrugName,
    )

    for (const field of flagged) {
      if (field === FieldName.DrugName) {
        continue
      }
      expect(
        terms.size,
        `${field} carries lasaChecked but the pair table holds only drug names, so the branch can never fire; either index values for this field or turn the flag off`,
      ).toBe(0)
    }
  })

  it("keeps the threshold below one, or the confidence branch is unreachable", () => {
    for (const policy of FIELD_POLICIES.values()) {
      expect(
        policy.autoAcceptThreshold,
        `${policy.field} would refuse every value at a threshold of 1`,
      ).toBeLessThan(1)
      expect(policy.autoAcceptThreshold).toBeGreaterThan(0)
    }
  })

  it("requires a read-back wherever no validator can prove the value", () => {
    for (const policy of FIELD_POLICIES.values()) {
      if (policy.validator !== "none") {
        continue
      }
      expect(
        policy.readBackAlways,
        `${policy.field} has no validator, so the spoken confirmation is the only proof there is`,
      ).toBe(true)
    }
  })

  it("lets the spell-out ceiling be reached before the field is given up on", () => {
    for (const policy of FIELD_POLICIES.values()) {
      if (policy.criticality === Criticality.Low) {
        continue
      }
      expect(
        policy.maxAttemptsBeforeSpellout,
        `${policy.field} would escalate before ever spelling out, so the spell-out branch is unreachable`,
      ).toBeLessThan(policy.maxAttemptsBeforeEscalation)
    }
  })

  it("does not promise a spell-out style on a field that can never spell out", () => {
    for (const policy of FIELD_POLICIES.values()) {
      if (policy.maxAttemptsBeforeSpellout < policy.maxAttemptsBeforeEscalation) {
        continue
      }
      expect(
        policy.spellOutStyle,
        `${policy.field} reaches its attempt ceiling before spelling out, so declaring a spellOutStyle claims behaviour the gate cannot produce`,
      ).toBeNull()
    }
  })

  it("covers every field name with exactly one policy", () => {
    for (const field of Object.values(FieldName)) {
      expect(() => policyFor(field)).not.toThrow()
    }
    expect(new Set([...FIELD_POLICIES.values()].map((p) => p.field)).size).toBe(
      FIELD_POLICIES.size,
    )
  })
})
