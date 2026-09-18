import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { STEPS } from "../../scripts/report/honest"

const REPORT = readFileSync("eval/REPORT.md", "utf8")

function runStep(command: string): string {
  const [bin, ...args] = command.split(" ")
  if (bin === undefined) {
    throw new Error(`empty command: ${command}`)
  }
  return execFileSync(bin, args, { encoding: "utf8", stdio: "pipe", shell: true })
}

type Anchor = {
  readonly step: string
  readonly figures: readonly string[]
}

const ANCHORS: readonly Anchor[] = [
  {
    step: "What the recognizer got wrong",
    figures: ["27.5%"],
  },
  {
    step: "Which mechanism pays for which re-ask",
    figures: ["100.0% [84.5%, 100.0%]", "27.1% [17.4%, 39.6%]"],
  },
  {
    step: "The gate against itself",
    figures: ["40.0%"],
  },
  {
    step: "What the arithmetic validators actually catch",
    figures: ["100.0%", "97.9%", "95.2%"],
  },
  {
    step: "Our own detector, pointed at our own catalogue",
    figures: ["5707"],
  },
  {
    step: "Is the reported confidence calibrated",
    figures: ["120 recorded utterances", "89.7% [76.4%, 95.9%]", "100.0% [92.0%, 100.0%]"],
  },
  {
    step: "Does the error rate depend on how established the drug is",
    figures: ["43.8%", "16.7%"],
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
    it(`"${anchor.step}" prints figures that still appear in eval/REPORT.md`, () => {
      const step = STEPS.find((candidate) => candidate.title === anchor.step)
      expect(
        step,
        `no step titled "${anchor.step}" exists in scripts/report/honest.ts`,
      ).toBeDefined()
      if (step === undefined) {
        return
      }
      const output = runStep(step.command)
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
