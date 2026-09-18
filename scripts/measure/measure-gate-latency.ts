import { globSync, readFileSync } from "node:fs"
import { resolve } from "node:path"
import { FieldName, VerdictOutcome } from "../../src/domain"
import { policyFor } from "../../src/domain/policy"
import { makeProvenance } from "../../src/domain/provenance"
import { makeWordSpan } from "../../src/domain/word-span"
import { decide } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"

type FixtureWord = {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly confidence: number
}
type FixtureFrame = {
  readonly message?: { readonly type?: string; readonly words?: readonly FixtureWord[] }
}
type Fixture = { readonly name: string; readonly frames: readonly FixtureFrame[] }

export function percentile(sorted: readonly number[], p: number): number {
  if (sorted.length === 0) {
    return 0
  }
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))
  return sorted[index] ?? 0
}

function wordSpansOf(words: readonly FixtureWord[]) {
  return words.map((word) =>
    makeWordSpan({
      text: word.text,
      startMs: word.start,
      endMs: word.end,
      confidence: word.confidence,
    }),
  )
}

export function gateLatencyOverFixtures(): readonly number[] {
  const policy = policyFor(FieldName.DrugName)
  const samples: number[] = []
  let warmed = false

  for (const path of globSync("eval/fixtures/*.json")) {
    const raw = readFileSync(resolve(path), "utf8")
    const fixture = JSON.parse(raw) as Fixture
    if (!Array.isArray(fixture.frames)) {
      continue
    }

    for (const frame of fixture.frames) {
      const words = frame.message?.words
      if (frame.message?.type !== "Turn" || words === undefined || words.length === 0) {
        continue
      }

      const spans = wordSpansOf(words)
      const spoken = spans.map((span) => span.text).join(" ")
      const candidate = {
        candidateId: `${fixture.name}-${spans[0]?.startMs ?? 0}`,
        field: FieldName.DrugName,
        rawValue: spoken,
        normalizedValue: spoken,
        provenance: makeProvenance({
          words: spans,
          turnOrder: 1,
          transcriptSlice: spoken,
          sessionId: fixture.name,
        }),
        verdict: {
          outcome: VerdictOutcome.Passed,
          validatorName: "ndc_catalog" as const,
          ruleCited: "existence in the built NDC catalogue",
          detail: "catalogue hit",
          checkedValue: spoken,
          evidence: { kind: "catalog" as const, rows: 1 },
        },
        lasa: lasaRiskFor(spans[0]?.text ?? ""),
        attempt: 1,
      }

      if (!warmed) {
        decide(candidate as never, policy)
        warmed = true
      }

      const started = performance.now()
      decide(candidate as never, policy)
      samples.push(performance.now() - started)
    }
  }

  return samples
}
