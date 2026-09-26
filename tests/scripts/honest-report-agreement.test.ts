import { execFile } from "node:child_process"
import { readFileSync } from "node:fs"
import { promisify } from "node:util"
import { describe, expect, it } from "vitest"
import { STEPS } from "../../scripts/report/honest"

const REPORT = readFileSync("eval/REPORT.md", "utf8")

const run = promisify(execFile)

async function runStep(command: string): Promise<string> {
  const [bin, ...args] = command.split(" ")
  if (bin === undefined) {
    throw new Error(`empty command: ${command}`)
  }
  const { stdout } = await run(bin, args, {
    encoding: "utf8",
    shell: true,
    maxBuffer: 64 * 1024 * 1024,
  })
  return stdout
}

type Anchor = {
  readonly step: string
  readonly figures: readonly string[]
}

const ANCHORS: readonly Anchor[] = [
  {
    step: "Does degraded audio turn a name into its published partner",
    figures: ["0 of 186, 0.0% [0.0%, 2.0%]", "31.1% [19.5%, 45.7%]", "9.7% [6.2%, 14.8%]"],
  },
  {
    step: "What the recognizer got wrong",
    figures: ["27.5%"],
  },
  {
    step: "Which mechanism pays for which re-ask",
    figures: [
      "| catalogue absence | 21/21 | 0/59 |",
      "| pair rule, contrastive read-back | 0/21 | 21/59 |",
      "| confidence below threshold | 0/21 | 13/59 |",
      "| standing read-back by regulation | 0/21 | 25/59 |",
      "| accepted without a question | 0/21 | 0/59 |",
      "100.0% [84.5%, 100.0%]",
      "35.6% [24.6%, 48.3%]",
      "59/59",
      "2.43 words",
      "28.7 words",
    ],
  },
  {
    step: "The gate against itself",
    figures: [
      "| shipped: pair rule, standing read-back, threshold | 0 | 0/20 | 20/20 | 20/20 | 4/20 | 6/20 | 10/20 |",
      "| without the pair rule: standing read-back, threshold | 0 | 20/20 | 0/20 | 20/20 | 0/20 | 8/20 | 12/20 |",
      "| threshold only: no pair rule, no standing read-back | 12 | 20/20 | 0/20 | 8/20 | 0/20 | 8/20 | 0/20 |",
    ],
  },
  {
    step: "How much of the published confusion list the product rule covers",
    figures: [
      "1056",
      "514",
      "754",
      "204 of 514 (39.7%)",
      "153 of 514 (29.8%)",
      "502 of 3730 (13.5%)",
      "| 2 | 174 (33.9%) |",
      "| 0 | 14 (2.7%) |",
      "6 of 44",
    ],
  },
  {
    step: "What the arithmetic validators actually catch",
    figures: ["100.0%", "97.9%", "95.2%", "32 080 mutations"],
  },
  {
    step: "Our own detector, pointed at our own catalogue",
    figures: ["5707"],
  },
  {
    step: "Which drugs the catalogue marks as controlled",
    figures: ["193 drugs", "CII 74, CIII 40, CIV 64,", "CV 15"],
  },
  {
    step: "Is the reported confidence calibrated",
    figures: ["120 recorded utterances", "89.7% [76.4%, 95.9%]", "100.0% [92.0%, 100.0%]"],
  },
  {
    step: "Does the error rate depend on how established the drug is",
    figures: ["43.8%", "16.7%"],
  },
  {
    step: "How many paid runs actually happened, including the discarded ones",
    figures: [
      "236",
      "943.2 s",
      "USD 0.1179",
      "none of them is in the ledger",
      "artefacts plus ledger: 25",
    ],
  },
  {
    step: "What the paid API has actually cost",
    figures: [
      "recorded paid runs: 18",
      "runs that did not complete, still billed: 13",
      "derived total: USD 4.0532",
    ],
  },
  {
    step: "Human voices, per speaker, with every failure named",
    figures: [
      "human voices: not measured (0 of 75 audio files present)",
      "pauses between identifier digit groups: not measured",
      "keyterms ablation on human voices: not measured",
    ],
  },
]

describe("what make honest prints today agrees with what eval/REPORT.md claims", () => {
  it("names every step this test is meant to cross-check, so an added step cannot go unguarded silently", () => {
    const titles = new Set(STEPS.map((step) => step.title))
    for (const anchor of ANCHORS) {
      expect(
        titles.has(anchor.step),
        `${anchor.step} is anchored here but scripts/report/honest.ts no longer has a step by that title; the anchor list has drifted from the source it is meant to guard`,
      ).toBe(true)
    }
  })

  for (const anchor of ANCHORS) {
    it(`"${anchor.step}" prints figures that still appear in eval/REPORT.md`, async () => {
      const step = STEPS.find((candidate) => candidate.title === anchor.step)
      expect(
        step,
        `no step titled "${anchor.step}" exists in scripts/report/honest.ts`,
      ).toBeDefined()
      if (step === undefined) {
        return
      }
      const output = await runStep(step.command)
      for (const figure of anchor.figures) {
        expect(
          output,
          `"${step.command}" no longer prints "${figure}"; the anchor itself is stale and must be updated against the live command, not against the document`,
        ).toContain(figure)
        expect(
          REPORT,
          `eval/REPORT.md no longer contains "${figure}", which "${step.command}" prints right now; either the report went stale or the corpus moved without the text being regenerated`,
        ).toContain(figure)
      }
    })
  }
})
