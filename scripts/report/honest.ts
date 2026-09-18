#!/usr/bin/env -S npx tsx

import { execSync } from "node:child_process"

export type Step = {
  readonly title: string
  readonly command: string
  readonly claim: string
}

export const STEPS: readonly Step[] = [
  {
    title: "What the recognizer got wrong",
    command: "npx tsx scripts/eer/report.ts eval/control",
    claim:
      "the entity error rate on a set of rarer names chosen before any measurement, with its Wilson interval",
  },
  {
    title: "Which mechanism pays for which re-ask",
    command: "npx tsx scripts/measure/coverage-matrix.ts",
    claim:
      "every recorded error assigned to the first mechanism that fires in the gate's own branch order, with the false-ask cost of each",
  },
  {
    title: "The gate against itself",
    command: "npx tsx scripts/measure/ab-gate.ts",
    claim:
      "the same corpus run with the pair check on and off, so the catches and the cost are printed together",
  },
  {
    title: "What the arithmetic validators actually catch",
    command: "npx tsx scripts/measure/audit-checksums.ts 200",
    claim:
      "exhaustive mutation of 200 valid identifiers of each kind, which is where our own claim about DEA turned out to be 4.8 percent false",
  },
  {
    title: "Our own detector, pointed at our own catalogue",
    command: "npx tsx scripts/measure/audit-catalog.ts",
    claim:
      "how many pairs of genuinely different drugs in the shipped catalogue share a consonant skeleton, which bounds the gap the skeleton mechanism admits",
  },
  {
    title: "Is the reported confidence calibrated",
    command: "npx tsx scripts/measure/analyse-calibration.ts",
    claim: "observed accuracy per reported-confidence bin over every recorded utterance",
  },
  {
    title: "Does the error rate depend on how established the drug is",
    command: "npx tsx scripts/measure/analyse-rarity.ts",
    claim: "entity error rate stratified by rarity, with overlapping intervals called out",
  },
  {
    title: "Latency against a budget, and how often it was exceeded",
    command: "npx tsx scripts/measure/latency-budget.ts",
    claim:
      "every recorded latency counted against a budget that lives in code, with the vendor-published bar separated from the ones this deployment chose and only the former able to fail the build",
  },
  {
    title: "The recorded audio path, replayed end to end",
    command: "npx tsx scripts/report/smoke-fixtures.ts",
    claim:
      "each recorded scenario driven through provenance matching, the validators, the pair table and the gate, failing loudly when a fixture stops producing the decision it was recorded to produce",
  },
  {
    title: "How many paid runs actually happened, including the discarded ones",
    command: "npx tsx scripts/report/live-run-count.ts",
    claim:
      "sessions counted from the artefacts each run left behind rather than from a memory of successful runs, with the rate-limited pass that cost money and produced nothing counted too",
  },
  {
    title: "What the paid API has actually cost",
    command: "npx tsx scripts/report/spend-report.ts",
    claim:
      "spend derived from the recorded run ledger at the rates on a named date, and withheld entirely rather than printed as a zero when no run has been recorded",
  },
]

const BAR = "=".repeat(78)

function run(step: Step): boolean {
  process.stdout.write(`\n${BAR}\n${step.title}\n`)
  process.stdout.write(`command: ${step.command}\n`)
  process.stdout.write(`what it shows: ${step.claim}\n${BAR}\n\n`)
  try {
    const output = execSync(step.command, { encoding: "utf8", stdio: "pipe" })
    if (output.trim().length === 0) {
      process.stdout.write(
        "this step printed nothing, which would read as success while proving nothing, so it counts as a failure\n",
      )
      return false
    }
    process.stdout.write(output.endsWith("\n") ? output : `${output}\n`)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stdout.write(`this step did not complete: ${message}\n`)
    return false
  }
}

function main(): void {
  process.stdout.write(
    "Every figure below is produced right now, on this machine, from files in this repository.\n",
  )
  process.stdout.write(
    "No API key is needed and no network call is made: the recorded runs are committed, and the\n",
  )
  process.stdout.write(
    "gate, the validators and the catalogue are pure functions over them. Each block prints the\n",
  )
  process.stdout.write("command that produced it and the size of the set it came from.\n")
  process.stdout.write(
    "\nWhat this cannot show is anything needing a live socket: turn-to-turn latency, the agent's\n",
  )
  process.stdout.write(
    "own timings, and the sealed held-out set. Those rows read as not measured in eval/REPORT.md\n",
  )
  process.stdout.write("and they are not filled in here either.\n")

  let failed = 0
  for (const step of STEPS) {
    if (!run(step)) {
      failed += 1
    }
  }

  process.stdout.write(`\n${BAR}\n`)
  if (failed === 0) {
    process.stdout.write(`all ${STEPS.length} offline measurements reproduced\n`)
    return
  }
  process.stdout.write(`${failed} of ${STEPS.length} steps did not complete\n`)
  process.exit(1)
}

if (process.argv[1]?.includes("honest")) {
  main()
}
