import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { FieldName, policyFor } from "@/domain"
import { benchmarkEntries } from "@/features/metrics/benchmark-row"
import { falseAskTally } from "@/features/metrics/measured-figures"

type RawScored = {
  readonly correct: boolean
  readonly minConfidence: number
}

type RawRun = {
  readonly measuredAt: string
  readonly scored: readonly RawScored[]
}

const REPORT = readFileSync("eval/REPORT.md", "utf8")
const MAKEFILE = readFileSync("Makefile", "utf8")
const COVERAGE_SCRIPT = readFileSync("scripts/measure/coverage-matrix.ts", "utf8")
const THRESHOLD = policyFor(FieldName.DrugName).autoAcceptThreshold

function load(set: string): RawRun {
  return JSON.parse(readFileSync(`eval/${set}/result-plain.json`, "utf8")) as RawRun
}

function row(id: string) {
  const found = benchmarkEntries().find((entry) => entry.id === id)
  if (found === undefined) {
    throw new Error(`no benchmark row ${id}`)
  }
  return found.row
}

function targetRecipe(command: string): string | null {
  const target = command.replace(/^make /, "")
  const lines = MAKEFILE.split("\n")
  const start = lines.findIndex((line) => line.startsWith(`${target}:`))
  if (start === -1) {
    return null
  }
  const recipe: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith("\t")) {
      break
    }
    recipe.push(line)
  }
  return recipe.join("\n")
}

const coverage = [load("control"), load("native16")]
const coverageScored = coverage.flatMap((run) => run.scored)
const coverageErrors = coverageScored.filter((entry) => !entry.correct)
const coverageCorrect = coverageScored.filter((entry) => entry.correct)
const coverageAbove = coverageErrors.filter((entry) => entry.minConfidence >= THRESHOLD)
const coverageBelow = coverageCorrect.filter((entry) => entry.minConfidence < THRESHOLD)
const coverageDate = coverage
  .map((run) => run.measuredAt.slice(0, 10))
  .sort()
  .at(-1)

describe("published entity error rates match the raw run files", () => {
  for (const set of ["dev", "control", "native16"]) {
    it(`eer-${set} equals what eval/${set}/result-plain.json holds`, () => {
      const raw = load(set)
      const errors = raw.scored.filter((entry) => !entry.correct).length
      const published = row(`eer-${set}`)
      const point = `${((errors / raw.scored.length) * 100).toFixed(1)}%`
      expect(published.value?.startsWith(`${point} [`), `${published.value}`).toBe(true)
      expect(published.n).toBe(raw.scored.length)
      expect(published.measuredOn).toBe(raw.measuredAt.slice(0, 10))
      expect(REPORT, `eval/REPORT.md does not publish ${point} for ${set}`).toContain(
        `**${point}**`,
      )
    })

    it(`eer-${set} names a make target that measures eval/${set}`, () => {
      const recipe = targetRecipe(row(`eer-${set}`).command)
      expect(
        recipe,
        `${row(`eer-${set}`).command} is not a target in the Makefile`,
      ).not.toBeNull()
      expect(recipe).toContain(`measure-eer.ts --set eval/${set}`)
      expect(recipe).not.toContain("--keyterms")
    })
  }
})

describe("published coverage figures match the runs make coverage-matrix reads", () => {
  it("reads exactly the control and native 16 kHz runs", () => {
    expect(COVERAGE_SCRIPT).toContain("eval/control/result-plain.json")
    expect(COVERAGE_SCRIPT).toContain("eval/native16/result-plain.json")
    expect(
      COVERAGE_SCRIPT,
      "the page pools the same runs as the command it cites, or its figure has the wrong method",
    ).not.toContain("eval/dev/result-plain.json")
    expect(targetRecipe("make coverage-matrix")).toContain("scripts/measure/coverage-matrix.ts")
  })

  it("errors the recognizer was confident about", () => {
    const published = row("errors-above-threshold")
    expect(published.value).toBe(`${coverageAbove.length} of ${coverageErrors.length}`)
    expect(published.n).toBe(coverageErrors.length)
    expect(published.measuredOn).toBe(coverageDate)
  })

  it("correct values the threshold would re-ask", () => {
    const published = row("threshold-false-asks")
    expect(published.value).toBe(`${coverageBelow.length} of ${coverageCorrect.length}`)
    expect(published.n).toBe(coverageCorrect.length)
    expect(REPORT).toContain(
      `With the pair rule switched off it takes ${coverageBelow.length} of the ${coverageCorrect.length}`,
    )
  })

  it("errors the catalogue refuses", () => {
    const published = row("catalogue-coverage")
    expect(published.n).toBe(coverageErrors.length)
    expect(REPORT).toContain(
      `| catalogue absence | ${coverageErrors.length}/${coverageErrors.length} |`,
    )
  })

  it("the headline counts the same asks as the table", () => {
    const tally = falseAskTally()
    expect(tally?.asked).toBe(coverageCorrect.length)
    expect(tally?.of).toBe(coverageCorrect.length)
    expect(tally?.thresholdWithoutPairRule).toBe(coverageBelow.length)
    expect(tally?.threshold).toBe(THRESHOLD)
    const n = coverageCorrect.length
    expect(REPORT).toContain(
      `| pair rule, contrastive read-back | 0/${coverageErrors.length} | ${tally?.byPairRule}/${n} |`,
    )
    expect(REPORT).toContain(
      `| confidence below threshold | 0/${coverageErrors.length} | ${tally?.byThreshold}/${n} |`,
    )
    expect(REPORT).toContain(
      `| standing read-back by regulation | 0/${coverageErrors.length} | ${tally?.byStandingReadBack}/${n} |`,
    )
  })
})

describe("every measured row cites a command that exists", () => {
  it("names a real Makefile target for each published value", () => {
    for (const entry of benchmarkEntries()) {
      if (entry.row.value === null || !entry.row.command.startsWith("make ")) {
        continue
      }
      expect(
        targetRecipe(entry.row.command),
        `${entry.id}: ${entry.row.command}`,
      ).not.toBeNull()
    }
  })

  it("publishes no value under a command that is not a make target", () => {
    for (const entry of benchmarkEntries()) {
      if (entry.row.value === null) {
        continue
      }
      expect(entry.row.command, entry.id).toMatch(/^make [a-z0-9-]+$/)
    }
  })
})
