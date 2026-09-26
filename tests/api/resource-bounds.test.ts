import { beforeEach, describe, expect, it } from "vitest"
import {
  GateAction,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  ReasonCode,
  VerdictOutcome,
} from "@/domain"
import {
  createMemoryEventStore,
  installIntakeEventStore,
  liveSessionCount,
  MAX_CANDIDATES_PER_SESSION,
  MAX_DECISIONS_PER_SESSION,
  MAX_LIVE_SESSIONS,
  MAX_TURNS_PER_SESSION,
  type MemoryEventBacking,
  rememberCandidate,
  rememberDecision,
} from "@/tools"
import { POST as postTurn } from "../../app/api/sessions/[id]/turns/route"
import { intake, registerSession, resetToolEnvironment } from "./harness"

const oneWord = [{ text: "lisinopril", start: 0, end: 200, confidence: 0.9 }]

function turnRequest(id: string, turnOrder = 1, words = oneWord): Request {
  return new Request(`https://readback.example.com/api/sessions/${id}/turns`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ turnOrder, transcript: "lisinopril", isFormatted: false, words }),
  })
}

function params(id: string) {
  return { params: Promise.resolve({ id }) }
}

function candidate(index: number) {
  const span = makeWordSpan({ text: "lisinopril", startMs: 0, endMs: 200, confidence: 0.9 })
  return makeCandidate({
    candidateId: `candidate-${index}`,
    field: "drug_name",
    rawValue: "lisinopril",
    normalizedValue: "lisinopril",
    provenance: makeProvenance({
      sessionId: "s",
      turnOrder: 1,
      transcriptSlice: "lisinopril",
      words: [span],
    }),
    verdict: makeVerdict({
      outcome: VerdictOutcome.Passed,
      validatorName: "ndc_catalog",
      detail: "found",
      checkedValue: "lisinopril",
    }),
    attempt: 1,
  })
}

const BOUND_TEST_TIMEOUT_MS = 30_000

describe("the unauthenticated turn route cannot be used to exhaust the server", () => {
  let backing: MemoryEventBacking

  beforeEach(async () => {
    await resetToolEnvironment()
    backing = new Map()
    installIntakeEventStore(createMemoryEventStore(backing))
    for (const id of ["one", "candidates", "decisions", "timings", "actual-session"]) {
      await registerSession(id)
    }
  })

  it("creates no state at all for an id an attacker invents, refusing it with E_UNKNOWN_SESSION", async () => {
    const before = liveSessionCount(backing)
    for (let i = 0; i < MAX_LIVE_SESSIONS * 4; i += 1) {
      const id = `attacker-${i}`
      const response = await postTurn(turnRequest(id), params(id))
      expect(response.status).toBe(404)
      expect((await response.json()).code).toBe("E_UNKNOWN_SESSION")
    }
    expect(
      liveSessionCount(backing),
      "an unregistered id must never allocate a log, or the turns route is an unauthenticated way to fill the store",
    ).toBe(before)
  })

  it("holds at most MAX_LIVE_SESSIONS registered sessions in the memory store", async () => {
    for (let i = 0; i < MAX_LIVE_SESSIONS * 2; i += 1) {
      await registerSession(`registered-${i}`)
    }
    expect(liveSessionCount(backing)).toBeLessThanOrEqual(MAX_LIVE_SESSIONS)
  })

  it("evicts the least recently used session, not the one still in the call", async () => {
    const kept = "still-talking"
    await registerSession(kept)
    await postTurn(turnRequest(kept), params(kept))
    for (let i = 0; i < MAX_LIVE_SESSIONS - 1; i += 1) {
      await registerSession(`filler-${i}`)
      await postTurn(turnRequest(kept, i + 2), params(kept))
    }
    expect((await intake(kept)).turns.length).toBeGreaterThan(1)
  })

  it(
    "caps the turns one session can accumulate",
    async () => {
      for (let t = 0; t < MAX_TURNS_PER_SESSION * 2; t += 1) {
        await postTurn(turnRequest("one", t), params("one"))
      }
      expect((await intake("one")).turns.length).toBe(MAX_TURNS_PER_SESSION)
    },
    BOUND_TEST_TIMEOUT_MS,
  )

  it(
    "keeps the newest turns when it caps, because the old ones no longer bear provenance",
    async () => {
      for (let t = 0; t < MAX_TURNS_PER_SESSION + 5; t += 1) {
        await postTurn(turnRequest("one", t), params("one"))
      }
      const orders = (await intake("one")).turns.map((turn) => turn.turnOrder)
      expect(orders.at(-1)).toBe(MAX_TURNS_PER_SESSION + 4)
      expect(orders).not.toContain(0)
    },
    BOUND_TEST_TIMEOUT_MS,
  )

  it("caps the candidates one session can accumulate", async () => {
    const state = await intake("candidates")
    for (let i = 0; i < MAX_CANDIDATES_PER_SESSION * 2; i += 1) {
      rememberCandidate(state, candidate(i))
    }
    expect(state.candidates.size).toBe(MAX_CANDIDATES_PER_SESSION)
  })

  it("caps the decisions one session can accumulate", async () => {
    const state = await intake("decisions")
    for (let i = 0; i < MAX_DECISIONS_PER_SESSION * 2; i += 1) {
      rememberDecision(state, {
        action: GateAction.Accept,
        reasonCode: ReasonCode.ValidatorPassedHighConf,
        field: "drug_name",
        candidateId: `candidate-${i}`,
        agentUtterance: "ok",
        confirmationMode: null,
        evidence: {
          minConfidence: 0.9,
          threshold: 0.8,
          outcome: "passed",
          ruleCited: "catalogue",
          attempt: 1,
          spanMs: 200,
        },
      })
    }
    expect(state.decisions.length).toBe(MAX_DECISIONS_PER_SESSION)
  })
})
