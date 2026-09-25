import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { VerdictOutcome } from "@/domain"
import { validateDea, validateNpi } from "@/validators"
import { buildLiveManifest } from "../../scripts/build/live-set"
import {
  identifierPauses,
  keytermsAblation,
  type LiveResult,
  summariseLive,
} from "../../scripts/live/live-analysis"
import { appendRunRecord, readRegistry, runRecordOf } from "../../scripts/live/run-registry"
import { itemFor, parseVoiceSet, VOICE_SET_DOC } from "../../scripts/live/voice-set"
import { acceptanceArtefact } from "../../scripts/live-receipt"
import { PAID_CONFIRMATION_FLAG, refusalReason } from "../../scripts/measure/measure-live"
import { liveReport } from "../../scripts/report/live-report"

const items = parseVoiceSet(readFileSync(VOICE_SET_DOC, "utf8"))

function words(text: string, gapMs = 100): LiveResult["words"] {
  let cursor = 0
  return text.split(" ").map((word) => {
    const start = cursor
    cursor += 300 + gapMs
    return { text: word, start, end: start + 300, confidence: 0.97 }
  })
}

function result(id: string, transcript: string, gapMs = 100): LiveResult {
  return { id, transcript, words: words(transcript, gapMs), closeCode: 1000 }
}

describe("E1: the manifest is built from the recording script, never typed twice", () => {
  it("parses 75 lines, 25 per speaker", () => {
    expect(items).toHaveLength(75)
    for (const speaker of ["s1", "s2", "s3"]) {
      expect(items.filter((item) => item.speaker === speaker)).toHaveLength(25)
    }
  })

  it("derives identifiers that pass their own checksums", () => {
    for (const item of items.filter((i) => i.kind === "npi")) {
      expect(validateNpi(String(item.expectedIdentifier)).outcome, item.id).toBe(
        VerdictOutcome.Passed,
      )
    }
    for (const item of items.filter((i) => i.kind === "dea")) {
      expect(validateDea(String(item.expectedIdentifier)).outcome, item.id).toBe(
        VerdictOutcome.Passed,
      )
    }
  })

  it("lets only line 20 confirm, and never a non-command", () => {
    const confirming = items.filter((item) => item.expectedAnswer === "confirmed")
    expect(new Set(confirming.map((item) => item.line))).toEqual(new Set(["20"]))
    for (const item of items.filter((i) => i.kind === "non-command")) {
      expect(item.expectedAnswer, item.id).not.toBe("confirmed")
    }
  })

  it("records every file as absent until the audio exists, with no digest", () => {
    const manifest = buildLiveManifest(
      readFileSync(VOICE_SET_DOC, "utf8"),
      "2026-09-25T00:00:00Z",
    )
    expect(manifest.count).toBe(75)
    expect(manifest.items.every((item) => item.present === (item.sha256 !== null))).toBe(true)
  })
})

describe("E1, E5, E8: the analysis names failures, speakers and pauses", () => {
  const hydromorphone = itemFor("s9", "01", "lasa", "Hydromorphone two milligrams, by mouth.")
  const amlodipine = itemFor(
    "s9",
    "15",
    "safe",
    "Amlodipine five milligrams, by mouth once daily.",
  )
  const npi = itemFor(
    "s9",
    "17",
    "npi",
    "My NPI is one two three, four five six, seven eight nine three.",
  )
  const mhm = itemFor("s9", "25", "non-command", "Mhm.")
  const set = [hydromorphone, amlodipine, npi, mhm]

  it("counts a natural LASA mishearing, lists the failure and gives the speaker a row", () => {
    const summary = summariseLive(set, [
      result("s9-01", "Morphine two milligrams by mouth"),
      result("s9-15", "Amlodipine five milligrams by mouth once daily"),
    ])
    expect(summary.drugN).toBe(2)
    expect(summary.failures.map((f) => f.id)).toEqual(["s9-01"])
    expect(summary.naturalLasaMishearings).toBe(1)
    expect(summary.perSpeaker).toEqual([expect.objectContaining({ speaker: "s9", n: 2 })])
  })

  it("counts a false confirmation when a non-command is heard as yes", () => {
    const summary = summariseLive(set, [result("s9-25", "Yes")])
    expect(summary.falseConfirmations).toBe(1)
    expect(summary.nonCommandN).toBe(1)
  })

  it("measures the pauses between identifier digit groups", () => {
    const pauses = identifierPauses(set, [
      result("s9-17", "one two three four five six seven eight nine three", 450),
    ])
    expect(pauses.n).toBe(9)
    expect(pauses.overDefaultMinTurnSilence).toBe(9)
  })

  it("compares the plain and the LASA-hinted arms", () => {
    const ablation = keytermsAblation(
      set,
      [result("s9-01", "Hydromorphone two milligrams")],
      [result("s9-01", "Morphine two milligrams")],
    )
    expect(ablation).toEqual({ n: 1, partnerPlain: 0, partnerHinted: 1 })
  })

  it("prints not measured, never a zero, when nothing was recorded", () => {
    expect(liveReport(null, null, null)).toContain("human voices: not measured")
  })
})

describe("E1 and E2: paid runs are refused without approval and recorded when they happen", () => {
  it("refuses to open a socket without the paid confirmation flag", () => {
    const reason = refusalReason({
      argv: ["node", "measure-live"],
      key: "k",
      manifest: null,
      outPath: "x",
      outExists: false,
    })
    expect(reason).toContain(PAID_CONFIRMATION_FLAG)
  })

  it("refuses when no audio file is present", () => {
    const manifest = buildLiveManifest(readFileSync(VOICE_SET_DOC, "utf8"), "t")
    const reason = refusalReason({
      argv: [PAID_CONFIRMATION_FLAG],
      key: "k",
      manifest: { ...manifest, present: 0 },
      outPath: "x",
      outExists: false,
    })
    expect(reason).toContain("no audio file")
  })

  it("requires a run record to name what it did not verify", () => {
    expect(() =>
      runRecordOf({
        kind: "probe",
        command: "c",
        outcome: "completed",
        reason: "r",
        socketSeconds: 1,
        sockets: ["stt"],
        sessionIds: [],
        boundaries: [],
      }),
    ).toThrow()
  })

  it("records a failed and an inconclusive attempt beside a completed one, and debits the ledger", () => {
    const dir = mkdtempSync(join(tmpdir(), "readback-runs-"))
    const registry = join(dir, "runs.json")
    const ledger = join(dir, "ledger.json")
    writeFileSync(registry, JSON.stringify({ runs: [] }), "utf8")
    copyFileSync("eval/spend-ledger.json", ledger)
    const before = JSON.parse(readFileSync(ledger, "utf8")).runs.length
    for (const [index, outcome] of (
      ["completed", "failed", "inconclusive"] as const
    ).entries()) {
      appendRunRecord(
        {
          kind: "acceptance_call",
          command: "npx tsx scripts/live-receipt.ts",
          outcome,
          reason: outcome,
          socketSeconds: 60,
          sockets: ["agent", "stt"],
          sessionIds: ["s"],
          boundaries: ["one call"],
          recordedAt: `2026-09-25T00:00:0${index}.000Z`,
        },
        registry,
        ledger,
      )
    }
    expect(readRegistry(registry).runs.map((run) => run.outcome)).toEqual([
      "completed",
      "failed",
      "inconclusive",
    ])
    expect(JSON.parse(readFileSync(ledger, "utf8")).runs.length).toBe(before + 3)
    expect(readRegistry(registry).runs[0]?.costUsd).toBe(0.0825)
  })

  it("builds the acceptance artefact with the model from the receipt and its boundaries", () => {
    const artefact = acceptanceArtefact({
      deployment: "https://preview.example.com",
      sessionId: "s",
      vendorSessionIds: ["v"],
      outcome: "inconclusive",
      reason: "the agent socket dropped",
      agentSeconds: 120,
      sttSeconds: 120,
      receipt: null,
      recordedAt: "2026-09-25T00:00:00.000Z",
    })
    expect(artefact.order).toBeNull()
    expect(artefact.actualModel).toBeNull()
    expect(artefact.costUsd).toBe(0.17)
    expect(artefact.boundaries.length).toBeGreaterThan(0)
  })
})
