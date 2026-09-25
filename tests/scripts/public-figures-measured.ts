import {
  type Anchor,
  capture,
  grouped,
  integer,
  type PublicDocument,
  percent,
} from "./public-figure-anchor"

const EER = "npx tsx scripts/eer/report.ts eval/control"
const COVERAGE = "npx tsx scripts/measure/coverage-matrix.ts"
const AB_GATE = "npx tsx scripts/measure/ab-gate.ts"
const RUNS = "npx tsx scripts/report/live-run-count.ts"
const CHECKSUMS = "npx tsx scripts/measure/audit-checksums.ts 200"
const CENSUS = "npx tsx scripts/measure/schedule-census.ts"
const ISMP = "npx tsx scripts/measure/ismp-coverage.ts"

const SLIDES: PublicDocument = "docs/slides.md"
const DECK: PublicDocument = "src/features/deck/slides.ts"
const README: PublicDocument = "README.md"

const NPI_ROW = /\| NPI[^|]*\| \d+ \| (\d+)\/(\d+) = [^|]*\| (\d+)\/(\d+) = /
const DEA_ROW = /\| DEA[^|]*\| \d+ \| (\d+)\/(\d+) = [^|]*\| (\d+)\/(\d+) = /
const DISCARDED_RUN = /\| not kept: overwritten[^|]*\| [^|]* \| (\d+) \| (\d+) \| (\d+) \|/
const CATALOGUE_ROW = /\| catalogue absence \| (\d+)\/(\d+) \| (\d+)\/(\d+) \|/
const PAIR_ROW = /\| pair rule, contrastive read-back \| (\d+)\/(\d+) \| (\d+)\/(\d+) \|/
const ASKED_ALL = /correct drug names the shipped gate asks about: (\d+)\/(\d+)/
const ASKED_SPLIT =
  /correct drug names the shipped gate asks about: (\d+)\/(\d+): (\d+) by the standing read-back, (\d+) by the threshold, (\d+) by the pair rule/
const ISMP_SIZE =
  /distinct pairs in the full list: (\d+);[\s\S]*?distinct names the product rule checks: (\d+)/
const ISMP_CATALOGUE = /catalogue drugs carrying a name on the list[^:]*: (\d+) of (\d+)/
const REFLEX_ROW = /\| (?:without the pair rule|shipped)[^|]*\| \d+ \| (\d+)\/(\d+) \|/g

function mishearing(said: string): (output: string) => string {
  return (output) =>
    capture(output, new RegExp(`${said} -> \\S+ at confidence ([\\d.]+)`))[0] ?? ""
}

function row(pattern: RegExp): (output: string) => string {
  return (output) => capture(output, pattern).join(" | ")
}

function reflexWrites(output: string): string {
  const rows = [...output.matchAll(REFLEX_ROW)]
  const shipped = rows[0]
  const without = rows[1]
  return `${without?.[1] ?? ""} | ${without?.[2] ?? ""} | ${shipped?.[1] ?? ""}`
}

function discardedRate(output: string): string {
  return percent(integer(output, DISCARDED_RUN, 2), integer(output, DISCARDED_RUN, 0))
}

function discardedCloses(output: string): string {
  return `${integer(output, DISCARDED_RUN, 2)} | ${integer(output, DISCARDED_RUN, 1)}`
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

function recordedSet(output: string): string {
  const [utterances, errors] = capture(
    output,
    /over (\d+) recorded utterances: (\d+) recognizer errors/,
  )
  return `${utterances} recorded utterances, ${errors} recognition errors`
}

const ON_THE_DECK: readonly (readonly [RegExp, string, (output: string) => string])[] = [
  [
    /(\d+) utterances, rare names chosen/,
    EER,
    (output) => String(integer(output, /: (\d+) utterances/)),
  ],
  [
    /Said vinorelbine, heard venorelbine, confidence (\d+\.\d+)/,
    EER,
    mishearing("vinorelbine"),
  ],
  [
    /Said glycopyrronium, heard glycopyrrhonium, confidence (\d+\.\d+)/,
    EER,
    mishearing("glycopyrronium"),
  ],
  [
    /Entity Error Rate ([\d.]+% \[[\d.]+%, [\d.]+%\])/,
    EER,
    (output) => capture(output, /\*\*([\d.]+% \[[\d.]+%, [\d.]+%\])\*\*/)[0] ?? "",
  ],
  [/(\d+ recorded utterances, \d+ recognition errors)/, COVERAGE, recordedSet],
  [
    /Absence from the catalogue: (\d+) of (\d+) errors caught, (\d+) of (\d+) correct values asked/,
    COVERAGE,
    row(CATALOGUE_ROW),
  ],
  [
    /Pair rule: (\d+) of (\d+) errors caught, (\d+) of (\d+) correct values given a contrastive question/,
    COVERAGE,
    row(PAIR_ROW),
  ],
  [
    /Correct drug names asked about by the shipped gate: (\d+) of (\d+)/,
    COVERAGE,
    row(ASKED_ALL),
  ],
  [
    /Without the pair rule a reflex yes writes (\d+) of (\d+) pair mishearings; with it, (\d+)/,
    AB_GATE,
    reflexWrites,
  ],
  [
    /make ab-gate, (\d+) candidates/,
    AB_GATE,
    (output) => String(integer(output, /corpus: (\d+) candidates/)),
  ],
  [/EER of ([\d.]+%)/, RUNS, discardedRate],
  [
    /all (\d+) failures closed with code 1008, all (\d+) successes with 1000/,
    RUNS,
    discardedCloses,
  ],
  [/false by ([\d.]+%) for DEA/, CHECKSUMS, deaMissRate],
  [/(?<!\d[ ,]?|\d of )(\d[\d,]*\d) mutations/, CHECKSUMS, mutationTotal(",")],
  [
    /sat in the data for (\d+) drugs/,
    CENSUS,
    (output) => String(integer(output, /: (\d+) of \d+ drugs carry deaSchedule/)),
  ],
]

export const MEASURED_ANCHORS: readonly Anchor[] = [
  ...ON_THE_DECK.flatMap(([locate, source, reproduce]) =>
    [SLIDES, DECK].map((document): Anchor => ({ document, locate, source, reproduce })),
  ),
  {
    document: README,
    locate:
      /(\d+) of (\d+) correct drug names are asked about: (\d+) by the standing read-back, (\d+) by the threshold, (\d+) by a contrastive question/,
    source: COVERAGE,
    reproduce: row(ASKED_SPLIT),
  },
  {
    document: README,
    locate:
      /Without the pair rule a reflex yes writes (\d+) of (\d+) pair mishearings; with it, (\d+)/,
    source: AB_GATE,
    reproduce: reflexWrites,
  },
  {
    document: README,
    locate: /carries (\d+) pairs over (\d+) names/,
    source: ISMP,
    reproduce: row(ISMP_SIZE),
  },
  {
    document: README,
    locate: /(\d+) of (\d+) catalogue drugs carry a listed name/,
    source: ISMP,
    reproduce: row(ISMP_CATALOGUE),
  },
  {
    document: README,
    locate: /\*\*Measured, and ([\d.]+%) false of DEA\*\*/,
    source: CHECKSUMS,
    reproduce: deaMissRate,
  },
  {
    document: README,
    locate: /DEA catches ([\d.]+%)/,
    source: CHECKSUMS,
    reproduce: (output) => percent(integer(output, DEA_ROW, 0), integer(output, DEA_ROW, 1)),
  },
  {
    document: README,
    locate: /NPI catches ([\d.]+%) of substitutions/,
    source: CHECKSUMS,
    reproduce: (output) => {
      const caught = integer(output, NPI_ROW, 0)
      const total = integer(output, NPI_ROW, 1)
      return caught === total ? "100%" : percent(caught, total)
    },
  },
  {
    document: README,
    locate: /(?<!\d[ ,]?|\d of )(\d[\d ]*\d) (?:exhaustive )?mutations/,
    source: CHECKSUMS,
    reproduce: mutationTotal(" "),
  },
]
