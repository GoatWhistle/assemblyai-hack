import { describe, expect, it } from "vitest"
import { PAIR_RULE_FLAG } from "@/domain"
import { buildAbCorpus } from "../../scripts/arms/ab-corpus"
import { armFor } from "../../scripts/arms/shipped-policy"
import { summariesFor } from "../../scripts/measure/ab-gate"

const corpus = buildAbCorpus(20260916)
const summaries = summariesFor(corpus)

function arm(id: "shipped" | "without_pair_rule" | "threshold_only") {
  const summary = summaries.get(id)
  if (summary === undefined) {
    throw new Error(`no summary for ${id}`)
  }
  return summary
}

describe("the pair rule against the same policy without it", () => {
  it("builds a corpus that carries both mishearings and correct values", () => {
    expect(corpus.filter((entry) => entry.misheard).length).toBeGreaterThan(0)
    expect(corpus.filter((entry) => !entry.misheard).length).toBeGreaterThan(0)
  })

  it("compares arms that differ by the pair rule alone, both keeping the standing read-back", () => {
    const shipped = armFor("shipped").policy
    const without = armFor("without_pair_rule").policy
    const keys = Object.keys(shipped) as (keyof typeof shipped)[]
    expect(keys.filter((key) => shipped[key] !== without[key])).toEqual([PAIR_RULE_FLAG])
    expect(without.readBackAlways).toBe(true)
  })

  it("leaves no pair mishearing for a reflex yes to write when the pair rule is on", () => {
    expect(arm("shipped").reflexWrites).toBe(0)
    expect(arm("shipped").contrastiveOnErrors).toBe(arm("shipped").mishearings)
  })

  it("lets a reflex yes write every pair mishearing without the pair rule, although each was read back", () => {
    const without = arm("without_pair_rule")
    expect(without.writtenUnasked, "the standing read-back asks every value").toBe(0)
    expect(
      without.reflexWrites,
      "a plain read-back answered by reflex is the hearback failure the pair rule exists for",
    ).toBe(without.mishearings)
  })

  it("keeps the threshold-only arm as the baseline that writes mishearings unasked", () => {
    expect(arm("threshold_only").writtenUnasked).toBeGreaterThan(0)
  })

  it("reports the cost on correct values instead of hiding it", () => {
    const shipped = arm("shipped")
    expect(shipped.askedCorrect, "every correct drug name is read back by regulation").toBe(
      shipped.correctValues,
    )
    expect(shipped.thresholdOnCorrect).toBeGreaterThan(0)
  })
})
