import {
  type Anchor,
  capture,
  grouped,
  integer,
  type PublicDocument,
  percent,
} from "./public-figure-anchor"

const COVERAGE = "npx tsx scripts/measure/coverage-matrix.ts"
const AB_GATE = "npx tsx scripts/measure/ab-gate.ts"
const CHECKSUMS = "npx tsx scripts/measure/audit-checksums.ts 200"
const ISMP = "npx tsx scripts/measure/ismp-coverage.ts"

const README: PublicDocument = "README.md"
const EVIDENCE: PublicDocument = "docs/evidence.md"

const NPI_ROW = /\| NPI[^|]*\| \d+ \| (\d+)\/(\d+) = [^|]*\| (\d+)\/(\d+) = /
const DEA_ROW = /\| DEA[^|]*\| \d+ \| (\d+)\/(\d+) = [^|]*\| (\d+)\/(\d+) = /
const ASKED_SPLIT =
  /correct drug names the shipped gate asks about: (\d+)\/(\d+): (\d+) by the standing read-back, (\d+) by the threshold, (\d+) by the pair rule/
const ISMP_SIZE =
  /distinct pairs in the full list: (\d+);[\s\S]*?distinct names the product rule checks: (\d+)/
const ISMP_CATALOGUE = /catalogue drugs carrying a name on the list[^:]*: (\d+) of (\d+)/
const REFLEX_ROW = /\| (?:without the pair rule|shipped)[^|]*\| \d+ \| (\d+)\/(\d+) \|/g

function row(pattern: RegExp): (output: string) => string {
  return (output) => capture(output, pattern).join(" | ")
}

function reflexWrites(output: string): string {
  const rows = [...output.matchAll(REFLEX_ROW)]
  const shipped = rows[0]
  const without = rows[1]
  return `${without?.[1] ?? ""} | ${without?.[2] ?? ""} | ${shipped?.[1] ?? ""}`
}

function deaMissRate(output: string): string {
  const caught = integer(output, DEA_ROW, 0)
  const total = integer(output, DEA_ROW, 1)
  return percent(total - caught, total)
}

function mutationTotal(separator: string): (output: string) => string {
  return (output) => {
    const npi = integer(output, NPI_ROW, 1) + integer(output, NPI_ROW, 3)
    const dea = integer(output, DEA_ROW, 1) + integer(output, DEA_ROW, 3)
    return grouped(npi + dea, separator)
  }
}

export const MEASURED_ANCHORS: readonly Anchor[] = [
  ...[README, EVIDENCE].flatMap((document): readonly Anchor[] => [
    {
      document,
      locate:
        /(\d+) of (\d+) correct drug names are asked about: (\d+) by the standing read-back, (\d+) by the threshold, (\d+) by a contrastive question/,
      source: COVERAGE,
      reproduce: row(ASKED_SPLIT),
    },
    {
      document,
      locate:
        /Without the pair rule a reflex yes writes (\d+) of (\d+) pair mishearings; with it, (\d+)/,
      source: AB_GATE,
      reproduce: reflexWrites,
    },
    {
      document,
      locate: /carries (\d+) pairs over (\d+) names/,
      source: ISMP,
      reproduce: row(ISMP_SIZE),
    },
    {
      document,
      locate: /(\d+) of (\d+) catalogue drugs carry a listed name/,
      source: ISMP,
      reproduce: row(ISMP_CATALOGUE),
    },
    {
      document,
      locate: /DEA catches ([\d.]+%)/,
      source: CHECKSUMS,
      reproduce: (output) => percent(integer(output, DEA_ROW, 0), integer(output, DEA_ROW, 1)),
    },
    {
      document,
      locate: /NPI catches ([\d.]+%) of substitutions/,
      source: CHECKSUMS,
      reproduce: (output) => {
        const caught = integer(output, NPI_ROW, 0)
        const total = integer(output, NPI_ROW, 1)
        return caught === total ? "100%" : percent(caught, total)
      },
    },
    {
      document,
      locate: /(?<!\d[ ,]?|\d of )(\d[\d ]*\d) (?:exhaustive )?mutations/,
      source: CHECKSUMS,
      reproduce: mutationTotal(" "),
    },
  ]),
  {
    document: EVIDENCE,
    locate: /\*\*Measured, and ([\d.]+%) false of DEA\*\*/,
    source: CHECKSUMS,
    reproduce: deaMissRate,
  },
]
