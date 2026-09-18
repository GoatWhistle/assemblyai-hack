import { describe, expect, it } from "vitest"
import { catalogFromFile, neighbourFor } from "@/catalog"
import { consonantSkeleton, skeletonNeighbours } from "@/validators"
import fixture from "../../eval/fixtures/catalog-fixture.json"

const catalog = catalogFromFile(fixture as never)

describe("the consonant skeleton", () => {
  it("drops vowels, y and h, and folds ph to f", () => {
    expect(consonantSkeleton("vinorelbine")).toBe("vnrlbn")
    expect(consonantSkeleton("venorelbine")).toBe("vnrlbn")
    expect(consonantSkeleton("morphine")).toBe(consonantSkeleton("morfine"))
  })

  it("ignores case, spacing and punctuation so a transcript matches a catalogue row", () => {
    expect(consonantSkeleton("Glyco-Pyrronium ")).toBe(consonantSkeleton("glycopyrronium"))
  })

  it("collapses the vowel substitutions that recorded mishearings actually made", () => {
    for (const [spoken, heard] of [
      ["vinorelbine", "venorelbine"],
      ["glycopyrronium", "glycopyrrhonium"],
      ["pemigatinib", "pamigatinib"],
      ["encorafenib", "encarafenib"],
    ] as const) {
      expect(
        consonantSkeleton(spoken),
        `${spoken} and ${heard} differ only in unstressed vowels, which is the pattern in the recorded errors`,
      ).toBe(consonantSkeleton(heard))
    }
  })
})

describe("skeleton neighbours", () => {
  it("refuses to guess from a stub, because three consonants match too much", () => {
    expect(skeletonNeighbours("abc", { namesForSkeleton: () => ["anything"] })).toBeNull()
  })

  it("never returns the heard word as its own neighbour", () => {
    expect(
      skeletonNeighbours("lisinopril", { namesForSkeleton: () => ["lisinopril"] }),
      "offering the caller the word they just said is not a disambiguation",
    ).toBeNull()
  })

  it("recovers the catalogue name a mishearing came from", () => {
    const neighbour = neighbourFor(catalog, "lisinipril")
    expect(neighbour?.candidates).toContain("lisinopril")
  })

  it("stays silent when the heard value is itself in the catalogue", () => {
    expect(
      neighbourFor(catalog, "lisinopril"),
      "a value that exists needs no neighbour; firing here would be a false ask",
    ).toBeNull()
  })

  it("stays silent on a value with no catalogue relative", () => {
    expect(neighbourFor(catalog, "zzzqqqwwww")).toBeNull()
  })
})
