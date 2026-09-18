import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { afterEach, describe, expect, it } from "vitest"
import { loadSets } from "../../scripts/measure/analyse-calibration"

const SET_DIR = "eval/__calibration_control__"

afterEach(() => {
  if (existsSync(SET_DIR)) {
    rmSync(SET_DIR, { recursive: true })
  }
})

describe("loadSets never treats a corrupted result file as an absent one", () => {
  it("skips a set directory that genuinely does not exist", () => {
    expect(
      loadSets(["eval/__does_not_exist__"]),
      "a set that was never measured must read as empty, not as an error",
    ).toEqual([])
  })

  it("throws rather than silently dropping a result file that exists but fails to parse", () => {
    mkdirSync(SET_DIR, { recursive: true })
    writeFileSync(`${SET_DIR}/result-plain.json`, "{ not valid json", "utf8")
    expect(
      () => loadSets([SET_DIR]),
      "a result file that exists but is corrupted must fail loudly; the earlier version of this function caught every error including a parse failure and silently treated the set as unmeasured, which would understate N in the calibration table with no indication a set failed to load",
    ).toThrow()
  })

  it("loads a well-formed result file's scored entries", () => {
    mkdirSync(SET_DIR, { recursive: true })
    const scored = [
      { spoken: "atorvastatin", heard: "atorvastatin", correct: true, minConfidence: 0.99 },
    ]
    writeFileSync(`${SET_DIR}/result-plain.json`, JSON.stringify({ scored }), "utf8")
    expect(loadSets([SET_DIR])).toEqual(scored)
  })
})
