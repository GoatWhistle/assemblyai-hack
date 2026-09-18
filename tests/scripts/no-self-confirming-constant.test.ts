import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { RATE_USD_PER_HOUR } from "@/domain"

const SCRIPT_DIR = "scripts"

const SELF_PATH = "tests/scripts/no-self-confirming-constant.test.ts"

const RATE_LITERALS: readonly string[] = Object.values(RATE_USD_PER_HOUR).map((rate) =>
  String(rate),
)

const PRICE_LITERAL_EXEMPT: Readonly<Record<string, string>> = Object.freeze({
  "scripts/checks/contrast.mjs":
    "its 4.5 is the WCAG body-text contrast ratio, which happens to share a value with the agent socket rate and has nothing to do with money",
})

const SELF_COMPARISON = new RegExp(
  [
    "expect\\(\\s*([A-Za-z_$][\\w$.]*(?:\\.length)?)\\s*\\)",
    "\\s*\\.\\s*to(?:Be|Equal|BeLessThanOrEqual|BeGreaterThanOrEqual|StrictEqual)",
    "\\(\\s*\\1\\s*\\)",
  ].join(""),
)

const SUCCESS_PHRASES: readonly RegExp[] = [
  /ALL VERIFICATIONS PASSED/,
  /ALL CHECKS PASSED/,
  /PASSED: [A-Za-z0-9-]+ verified/,
]

function sourceFiles(dir: string): readonly string[] {
  const out: string[] = []
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry).replace(/\\/g, "/")
    if (statSync(path).isDirectory()) {
      out.push(...sourceFiles(path))
      continue
    }
    if (path.endsWith(".ts") || path.endsWith(".mjs")) {
      out.push(path)
    }
  }
  return out
}

const FILES = sourceFiles(SCRIPT_DIR)

describe("no script or test asserts a value against the same source it read it from", () => {
  it("scans a real population of scripts, so a passing result is not the scanner finding nothing", () => {
    expect(
      FILES.length,
      "this whole file is vacuous if the walk returned nothing; a check that passes when its subject is missing manufactures confidence, which is the defect that made three ratchets green while checking nothing",
    ).toBeGreaterThan(30)
  })

  it("derives every published rate literal from the rate table rather than repeating one inline", () => {
    const offenders: string[] = []
    for (const path of FILES) {
      if (PRICE_LITERAL_EXEMPT[path] !== undefined) {
        continue
      }
      const source = readFileSync(path, "utf8")
      if (source.includes("ratePerHourFor")) {
        continue
      }
      for (const literal of RATE_LITERALS) {
        const pattern = new RegExp(`(?<![\\d.])${literal.replace(".", "\\.")}(?![\\d])`)
        if (pattern.test(source)) {
          offenders.push(`${path} carries the literal ${literal}`)
        }
      }
    }
    expect(
      [...new Set(offenders)].sort(),
      "a price typed into a script is a second price list, and it drifts from the one that carries a check date. Every figure about money must come from ratePerHourFor so that one table governs all of them",
    ).toEqual([])
  })

  it("keeps the rate literals it scans for in step with the rate table, so the scan cannot go stale", () => {
    expect(
      RATE_LITERALS.length,
      "if the rate table were emptied this scan would look for nothing and pass; the count is tied to the table so an empty table fails here rather than silently disabling the check",
    ).toBe(Object.keys(RATE_USD_PER_HOUR).length)
    expect(
      RATE_LITERALS,
      "the literals are derived from the table's own values; typing them in here would reproduce inside the guard the exact defect the guard exists to find",
    ).toContain(String(RATE_USD_PER_HOUR.agent))
  })

  it("names an exemption only with a reason, so a silent allowlist cannot grow", () => {
    for (const [path, reason] of Object.entries(PRICE_LITERAL_EXEMPT)) {
      expect(
        reason.length,
        `${path} is exempt from the price-literal scan with no reason recorded; an unexplained exemption will one day cover a real defect`,
      ).toBeGreaterThan(40)
      expect(
        FILES,
        `${path} is exempt from a scan it is no longer part of. A stale exemption is worse than none, because it reads as deliberate`,
      ).toContain(path)
    }
  })

  it("never compares a quantity with itself, the assertion that cannot fail", () => {
    const offenders: string[] = []
    for (const path of [...FILES, ...sourceFiles("tests")]) {
      if (path === SELF_PATH) {
        continue
      }
      if (SELF_COMPARISON.test(readFileSync(path, "utf8"))) {
        offenders.push(path)
      }
    }
    expect(
      [...new Set(offenders)].sort(),
      "an assertion whose two sides are the same expression passes for every possible input. This project shipped one: the ratchet meta-test compared uncovered.length with itself and so claimed every ratchet had a positive control while only two did",
    ).toEqual([])
  })

  it("prints no unconditional success phrase that a skipped check could not contradict", () => {
    const offenders: string[] = []
    for (const path of FILES) {
      const source = readFileSync(path, "utf8")
      for (const pattern of SUCCESS_PHRASES) {
        if (pattern.test(source)) {
          offenders.push(`${path} matches ${pattern.source}`)
        }
      }
    }
    expect(
      offenders.sort(),
      "two submissions in this field print exactly these phrases while asserting their own configuration or skipping a check behind an absolute path from a developer machine. A success line is only meaningful if some input makes it absent",
    ).toEqual([])
  })

  it("has a working positive control: the detector matches the line this project actually shipped", () => {
    const planted = ["expect(uncovered.length)", ".toBeLessThanOrEqual(uncovered.length)"].join(
      "",
    )
    expect(
      SELF_COMPARISON.test(planted),
      "the detector must be shown catching the real defect, or the clean result above proves only that the pattern matches nothing at all",
    ).toBe(true)
    expect(
      SELF_COMPARISON.test("expect(caught.length).toBe(errors.length)"),
      "the detector must not flag a comparison between two genuinely different quantities, or it would push tests toward deletion rather than repair",
    ).toBe(false)
  })

  it("has a working positive control for the success-phrase scan too", () => {
    const planted = ["ALL VERIFICATIONS", " PASSED"].join("")
    expect(
      SUCCESS_PHRASES.some((pattern) => pattern.test(planted)),
      "a banned-phrase list nobody has seen match is indistinguishable from an empty list",
    ).toBe(true)
  })
})
