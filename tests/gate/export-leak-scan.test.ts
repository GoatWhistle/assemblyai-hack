import { describe, expect, it } from "vitest"
import {
  FIELD_NAMES,
  type FieldName,
  LasaSource,
  makeLasaRisk,
  policyFor,
  VerdictOutcome,
} from "@/domain"
import * as gate from "@/gate"
import { candidateFor } from "./factory"

const SECRET_MARKERS = [
  "x-readback-tool-secret",
  "AGENT_TOOL_SECRET",
  "ASSEMBLYAI_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "Bearer ",
  "assemblyai.com",
  "sk-",
]

const INTERNAL_MARKERS = [
  "candidate-",
  "test-session",
  "sourceRow",
  "row-1",
  "minConfidence",
  "[object Object]",
  "undefined",
  "NaN",
]

type Spoken = { readonly name: string; readonly text: string }

const LASA = makeLasaRisk({
  matchedTerm: "lisinopril",
  confusableWith: ["bisoprolol"],
  source: LasaSource.Ismp2023,
  sourceRow: "row-1",
})

const VALUE = "ten milligrams"

function decisionUtterances(field: FieldName): readonly Spoken[] {
  const policy = policyFor(field)
  const out: Spoken[] = []
  for (const outcome of Object.values(VerdictOutcome)) {
    for (const attempt of [1, 3, 4]) {
      for (const confidence of [0.2, 0.99]) {
        for (const hit of [false, true]) {
          const candidate = candidateFor({
            field,
            confidence,
            outcome,
            attempt,
            lasa: hit ? LASA : undefined,
          })
          out.push({
            name: `decide/${field}/${outcome}/attempt=${attempt}/conf=${confidence}/lasa=${hit}`,
            text: gate.decide(candidate, policy).agentUtterance,
          })
        }
      }
    }
  }
  return out
}

function directUtterances(field: FieldName): readonly Spoken[] {
  const policy = policyFor(field)
  return [
    { name: `abortUtterance/${field}`, text: gate.abortUtterance(field) },
    { name: `spokenField/${field}`, text: gate.spokenField(field) },
    { name: `spellOutUtterance/${field}`, text: gate.spellOutUtterance(field, policy) },
    { name: `readBackUtterance/${field}`, text: gate.readBackUtterance(field, VALUE) },
    { name: `acceptUtterance/${field}`, text: gate.acceptUtterance(field, VALUE) },
    {
      name: `lowConfidenceUtterance/${field}`,
      text: gate.lowConfidenceUtterance(field, VALUE),
    },
    { name: `noValidatorUtterance/${field}`, text: gate.noValidatorUtterance(field, VALUE) },
  ]
}

function everyUtterance(): readonly Spoken[] {
  const perField = FIELD_NAMES.flatMap((field) => [
    ...decisionUtterances(field as FieldName),
    ...directUtterances(field as FieldName),
  ])
  return [
    ...perField,
    { name: "escalateUtterance", text: gate.escalateUtterance() },
    { name: "lasaUtterance", text: gate.lasaUtterance(LASA) },
    { name: "comboUtterance", text: gate.comboUtterance("the strength does not exist") },
  ]
}

const UTTERANCES = everyUtterance()

describe("nothing internal leaks through anything the gate exports", () => {
  it("drives a broad set of utterances, so a clean scan is not an empty scan", () => {
    expect(
      UTTERANCES.length,
      "a leak scan over nothing would pass while checking nothing, the exact defect this project has already found three times",
    ).toBeGreaterThan(200)
  })

  it("puts no credential or vendor endpoint into anything spoken to a caller", () => {
    const leaking = UTTERANCES.filter((u) =>
      SECRET_MARKERS.some((m) => u.text.toLowerCase().includes(m.toLowerCase())),
    ).map((u) => u.name)
    expect(
      leaking,
      "a spoken utterance is read aloud and stored in the transcript; a secret reaching it is disclosed twice over",
    ).toEqual([])
  })

  it("puts no internal identifier or serialization artefact into a spoken utterance", () => {
    const leaking = UTTERANCES.filter((u) =>
      INTERNAL_MARKERS.some((m) => u.text.includes(m)),
    ).map((u) => ({ name: u.name, text: u.text }))
    expect(
      leaking,
      "a candidate id or an [object Object] read aloud to a prescriber is both a disclosure and an obvious defect on a demo",
    ).toEqual([])
  })

  it("never emits an empty or whitespace-only utterance, because a silent gate cannot re-ask", () => {
    const empty = UTTERANCES.filter((u) => u.text.trim().length === 0).map((u) => u.name)
    expect(empty, "an empty re-ask is indistinguishable from the gate having accepted").toEqual(
      [],
    )
  })

  it("exports no name that looks like a second way to build a confirmed value", () => {
    const forbidden = Object.keys(gate).filter((k) =>
      /^(force|unsafe|make|build|create)Confirmed/i.test(k),
    )
    expect(
      forbidden,
      "confirm() is the only constructor of ConfirmedValue; a convenience builder beside it would dissolve the invariant without tripping the brand check",
    ).toEqual([])
  })

  it("keeps every export callable without throwing on ordinary input, so none is a stale signature", () => {
    const broken = UTTERANCES.filter((u) => typeof u.text !== "string").map((u) => u.name)
    expect(broken, "an export that no longer returns a string is dead or mis-typed").toEqual([])
  })
})
