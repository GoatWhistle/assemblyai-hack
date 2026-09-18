#!/usr/bin/env -S npx tsx

import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { catalogFromFile } from "@/catalog"
import {
  GateAction,
  makeCandidate,
  makeProvenance,
  policyFor,
  wordSpanFromTurnWord,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import {
  matchProvenance,
  normalizeFieldValue,
  type TurnRecord,
  validateField,
} from "@/sessions"
import { EXPECTATIONS, type Expectation, SMOKE_SCOPE } from "./smoke-expectations"

const CATALOG_FIXTURE = "eval/fixtures/catalog-fixture.json"

type FixtureWord = {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly confidence: number
}

type FixtureFrame = {
  readonly socket: string
  readonly direction: string
  readonly message: {
    readonly type?: string
    readonly turn_order?: number
    readonly turn_is_formatted?: boolean
    readonly transcript?: string
    readonly words?: readonly FixtureWord[]
  }
}

type Fixture = {
  readonly name: string
  readonly sessionId: string
  readonly frames: readonly FixtureFrame[]
}

function loadFixture(name: string): Fixture {
  return JSON.parse(readFileSync(resolve(`eval/fixtures/${name}.json`), "utf8")) as Fixture
}

export function turnsOf(fixture: Fixture): readonly TurnRecord[] {
  const out: TurnRecord[] = []
  for (const frame of fixture.frames) {
    const message = frame.message
    if (frame.socket !== "stt" || message.type !== "Turn" || message.words === undefined) {
      continue
    }
    out.push({
      turnOrder: message.turn_order ?? out.length + 1,
      transcript: message.transcript ?? "",
      isFormatted: message.turn_is_formatted === true,
      words: message.words.map((word) => wordSpanFromTurnWord(word)),
    })
  }
  return out
}

export type Outcome = {
  readonly expectation: Expectation
  readonly ok: boolean
  readonly detail: string
}

export function runExpectation(expectation: Expectation): Outcome {
  const fixture = loadFixture(expectation.fixture)
  const turns = turnsOf(fixture)
  if (turns.length === 0) {
    return {
      expectation,
      ok: false,
      detail: `${expectation.fixture} carried no stt Turn frame at all, so nothing was replayed; an empty replay must never read as a pass`,
    }
  }

  const matched = matchProvenance({
    hint: expectation.hint,
    turns,
    sessionId: fixture.sessionId,
  })
  if (matched === null) {
    return {
      expectation,
      ok: false,
      detail: `the quotation "${expectation.hint}" was not found in any recorded turn of ${expectation.fixture}, so provenance could not be established`,
    }
  }

  const catalog = catalogFromFile(
    JSON.parse(readFileSync(resolve(CATALOG_FIXTURE), "utf8")) as never,
  )
  const policy = policyFor(expectation.field)
  const normalizedValue = normalizeFieldValue(expectation.field, expectation.value)
  const verdict = validateField({ field: expectation.field, normalizedValue, catalog })
  const candidate = makeCandidate({
    candidateId: `${fixture.name}-${expectation.field}`,
    field: expectation.field,
    rawValue: expectation.value,
    normalizedValue,
    provenance: makeProvenance({
      words: matched.provenance.words,
      turnOrder: matched.turnOrder,
      transcriptSlice: matched.quotedSpan,
      sessionId: fixture.sessionId,
    }),
    verdict,
    lasa: policy.lasaChecked ? lasaRiskFor(expectation.value) : undefined,
    attempt: 1,
  })

  const decision = decide(candidate, policy)
  if (decision.reasonCode !== expectation.reasonCode) {
    return {
      expectation,
      ok: false,
      detail: `expected ${expectation.reasonCode}, got ${decision.reasonCode} with action ${decision.action}`,
    }
  }
  if (decision.action !== expectation.action) {
    return {
      expectation,
      ok: false,
      detail: `reason ${decision.reasonCode} was right but the action was ${decision.action}, expected ${expectation.action}`,
    }
  }
  if (decision.action === GateAction.Accept) {
    return {
      expectation,
      ok: false,
      detail:
        "the gate accepted a value every one of these fixtures was recorded to have refused; an accept here is the defect the whole check exists to find",
    }
  }
  return {
    expectation,
    ok: true,
    detail: `${decision.action} / ${decision.reasonCode}, provenance from turn ${matched.turnOrder} quoting "${matched.quotedSpan}" at min confidence ${candidate.provenance.minConfidence.toFixed(3)}`,
  }
}

function main(): void {
  process.stdout.write(
    "SMOKE: the recorded audio path, replayed through the server pipeline\n\n",
  )
  process.stdout.write("command: npx tsx scripts/report/smoke-fixtures.ts\n")
  process.stdout.write(`scope: ${SMOKE_SCOPE}\n\n`)

  if (EXPECTATIONS.length === 0) {
    process.stderr.write(
      "SMOKE FAILED: there are no expectations to run. A check with an empty subject passes while proving nothing, which is the exact defect this project has found three times.\n",
    )
    process.exit(1)
    return
  }

  const outcomes = EXPECTATIONS.map(runExpectation)
  for (const outcome of outcomes) {
    const mark = outcome.ok ? "ok  " : "FAIL"
    process.stdout.write(
      `${mark} ${outcome.expectation.fixture} / ${outcome.expectation.field}\n     ${outcome.detail}\n`,
    )
    if (!outcome.ok) {
      process.stdout.write(`     why this matters: ${outcome.expectation.why}\n`)
    }
  }

  const failed = outcomes.filter((outcome) => !outcome.ok)
  process.stdout.write("\n")
  if (failed.length > 0) {
    process.stderr.write(
      `SMOKE FAILED: ${failed.length} of ${outcomes.length} recorded scenarios no longer produce the decision they were recorded to produce.\n`,
    )
    for (const outcome of failed) {
      process.stderr.write(`  ${outcome.expectation.fixture}: ${outcome.detail}\n`)
    }
    process.exit(1)
    return
  }
  process.stdout.write(
    `SMOKE PASSED: ${outcomes.length} recorded scenarios replayed through provenance matching, the validators, the pair table and the gate, each reaching the decision it was recorded to reach.\n`,
  )
  process.stdout.write(
    "what remains unreachable from here, named rather than implied: microphone capture, the AudioWorklet, both resample paths, the four echo layers and the two socket clients. Those are browser code and are covered by make e2e with a fake microphone.\n",
  )
}

if (process.argv[1]?.includes("smoke-fixtures")) {
  main()
}
