import { describe, expect, it } from "vitest"
import {
  collapseThousandsSeparators,
  normalizeInteger,
  normalizeStrength,
  reconcileValue,
  spokenValueTokens,
  type TurnRecord,
} from "@/confirmation"
import { makeWordSpan } from "@/domain"

function turn(text: string): TurnRecord {
  return {
    turnOrder: 1,
    transcript: text,
    isFormatted: true,
    words: text
      .split(" ")
      .map((word, i) =>
        makeWordSpan({ text: word, startMs: i * 300, endMs: i * 300 + 250, confidence: 0.99 }),
      ),
  }
}

describe("T4: thousands are read the way a prescriber says and a recognizer writes them", () => {
  it("treats a comma as a thousands separator only before exactly three digits", () => {
    expect(collapseThousandsSeparators("1,000 mg")).toBe("1000 mg")
    expect(collapseThousandsSeparators("1,500,000")).toBe("1500000")
    expect(collapseThousandsSeparators("1,5 mg")).toBe("1,5 mg")
    expect(collapseThousandsSeparators("1,5000")).toBe("1,5000")
  })

  it("normalises 1,000 mg and one thousand milligrams to the same strength", () => {
    expect(normalizeStrength("1,000 mg")).toBe("1000 mg")
    expect(normalizeStrength("one thousand milligrams")).toBe("1000 mg")
    expect(normalizeStrength("1000 mg")).toBe("1000 mg")
  })

  it("never reads 1,5 as fifteen hundred", () => {
    expect(normalizeStrength("1,5 mg")).not.toBe("1500 mg")
    expect(normalizeStrength("1,5 mg")).not.toBe("15 mg")
    expect(normalizeInteger("1,5")).toBeNull()
  })

  it("normalises 1,500, one thousand five hundred and 10 thousand as integers", () => {
    expect(normalizeInteger("1,500")).toBe(1500)
    expect(normalizeInteger("one thousand")).toBe(1000)
    expect(normalizeInteger("one thousand five hundred")).toBe(1500)
    expect(normalizeInteger("10 thousand")).toBe(10000)
    expect(normalizeInteger("ten thousand")).toBe(10000)
    expect(normalizeInteger("twenty one")).toBe(21)
    expect(normalizeInteger("one hundred twenty")).toBe(120)
  })

  it("keeps the old readings that the eval set depends on", () => {
    expect(normalizeInteger("thirty")).toBe(30)
    expect(normalizeInteger("no refills")).toBe(0)
    expect(normalizeInteger("banana")).toBeNull()
  })

  it("keeps a dictated NPI as separate digits rather than summing it", () => {
    expect(spokenValueTokens("one two four five three one nine five nine nine")).toEqual([
      "1",
      "2",
      "4",
      "5",
      "3",
      "1",
      "9",
      "5",
      "9",
      "9",
    ])
  })

  it("accepts 1,000 mg as supported by the words one thousand milligrams", () => {
    expect(
      reconcileValue({ value: "1,000 mg", turn: turn("one thousand milligrams") }).supported,
    ).toBe(true)
    expect(reconcileValue({ value: "1000 mg", turn: turn("1,000 milligrams") }).supported).toBe(
      true,
    )
    expect(
      reconcileValue({ value: "10000 units", turn: turn("10 thousand units") }).supported,
    ).toBe(true)
  })

  it("still refuses a different amount", () => {
    expect(
      reconcileValue({ value: "1500 mg", turn: turn("one thousand milligrams") }).supported,
    ).toBe(false)
  })
})
