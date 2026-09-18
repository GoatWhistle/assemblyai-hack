import { describe, expect, it } from "vitest"
import type { GateDecision } from "@/domain"
import { FieldName, GateAction, ReasonCode } from "@/domain"
import {
  buildReport,
  createMemoryStore,
  FALSE_ASK_NOTE,
  reasonBreakdown,
  SessionOrigin,
  summarize,
} from "@/sessions"

function decision(action: GateAction, reasonCode: ReasonCode): GateDecision {
  return {
    action,
    reasonCode,
    field: FieldName.DrugName,
    candidateId: "c1",
    agentUtterance: "something",
    evidence: {},
    confirmationMode: null,
  }
}

const decisions: GateDecision[] = [
  decision(GateAction.AskDisambiguate, ReasonCode.LasaHit),
  decision(GateAction.AskDisambiguate, ReasonCode.LasaHit),
  decision(GateAction.AskConfirm, ReasonCode.LowConfidence),
  decision(GateAction.Accept, ReasonCode.ValidatorPassedHighConf),
]

const stored = {
  sessionId: "s1",
  startedAt: "2026-09-15T10:00:00.000Z",
  endedAt: "2026-09-15T10:05:00.000Z",
  decisions,
  events: [],
  closes: [],
  gateEnabled: true,
  origin: SessionOrigin.Live,
  orderId: "o1",
  committed: true,
}

describe("session store", () => {
  it("round trips a session through the in memory fallback", async () => {
    const store = createMemoryStore()
    expect(store.backend()).toBe("memory")
    await store.put(stored)
    expect((await store.get("s1"))?.orderId).toBe("o1")
    expect(await store.get("missing")).toBeNull()
  })

  it("summarizes asks, accepts and lasa catches", () => {
    const summary = summarize(stored)
    expect(summary.decisionCount).toBe(4)
    expect(summary.askCount).toBe(3)
    expect(summary.acceptCount).toBe(1)
    expect(summary.lasaCatchCount).toBe(2)
  })

  it("lists sessions newest first", async () => {
    const store = createMemoryStore()
    await store.put(stored)
    await store.put({ ...stored, sessionId: "s2", startedAt: "2026-09-15T11:00:00.000Z" })
    const list = await store.list()
    expect(list.map((s) => s.sessionId)).toEqual(["s2", "s1"])
  })

  it("breaks decisions down by reason code, most frequent first", () => {
    expect(reasonBreakdown(decisions)[0]).toEqual({ reasonCode: ReasonCode.LasaHit, count: 2 })
  })

  it("never reports a false ask rate in live mode", () => {
    const report = buildReport([summarize(stored)], decisions)
    expect(report.falseAskRate).toBeNull()
    expect(report.falseAskNote).toBe(FALSE_ASK_NOTE)
    expect(report.method.length).toBeGreaterThan(0)
  })

  it("reports an ask rate with the denominator it used", () => {
    const report = buildReport([summarize(stored)], decisions)
    expect(report.askRate).toBeCloseTo(3 / 4)
    expect(report.decisionCount).toBe(4)
  })

  it("returns a null ask rate rather than zero on an empty set", () => {
    expect(buildReport([], []).askRate).toBeNull()
  })
})
