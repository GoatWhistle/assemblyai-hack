import { act, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  CandidateStatus,
  FieldName,
  makeCandidate,
  makeProvenance,
  makeVerdict,
  makeWordSpan,
  policyFor,
  VerdictOutcome,
} from "@/domain"
import { decide } from "@/gate"
import { lasaRiskFor } from "@/lasa"
import {
  advance,
  callerSays,
  json,
  releaseRig,
  resetRig,
  rig,
  socket,
  startTheCall,
} from "./live-rig"

vi.mock("@/realtime/transport", async () => (await import("./live-rig")).transportModule())
vi.mock("@/audio/microphone", async () => (await import("./live-rig")).microphoneModule())

const { IntakeClient } = await import("@app/(pages)/intake-client")

const LASA = makeCandidate({
  candidateId: "cand-drug",
  field: FieldName.DrugName,
  rawValue: "Morphine",
  normalizedValue: "morphine",
  provenance: makeProvenance({
    words: [makeWordSpan({ text: "Morphine", startMs: 100, endMs: 700, confidence: 1 })],
    turnOrder: 0,
    transcriptSlice: "Morphine",
    sessionId: "srv-7",
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_catalog",
    detail: "fixture",
    checkedValue: "morphine",
  }),
  lasa: lasaRiskFor("morphine"),
  status: CandidateStatus.ReadBackPending,
  attempt: 1,
  createdAt: "2026-09-25T00:00:00.000Z",
})

const LASA_DECISION = decide(LASA, policyFor(LASA.field))

beforeEach(resetRig)
afterEach(releaseRig)

describe("U8 and U6: telemetry and the order panel are fed by the product path", () => {
  it("shows socket frames, the decision log and the commit block from real responses", async () => {
    rig.route = (url) =>
      url.endsWith("/turns")
        ? json({ turnsHeld: 1, candidates: [LASA], decisions: [LASA_DECISION] })
        : undefined
    await startTheCall(IntakeClient)
    await act(async () => {
      socket("agents").deliverJson({ type: "reply.started", reply_id: "r-1" })
    })
    await callerSays("Morphine")
    const telemetry = screen.getByRole("region", { name: "Telemetry" })
    expect(within(telemetry).getByText("Speaking")).toBeTruthy()
    expect(within(telemetry).getAllByText("reply.started").length).toBeGreaterThan(0)
    expect(within(telemetry).getByText("Live: two sockets")).toBeTruthy()
    expect(within(telemetry).getAllByText(LASA_DECISION.reasonCode).length).toBeGreaterThan(0)
    expect(within(telemetry).getByText("srv-7")).toBeTruthy()
    const order = screen.getByRole("region", { name: "Order summary" })
    expect(within(order).getByText("Commit blocked")).toBeTruthy()
    expect(
      within(order).getByText(/critical fields are unresolved: .*Drug name/),
      "the unresolved fields have to be named, not merely counted",
    ).toBeTruthy()
  })

  it("shows the recognizer model Begin reported", async () => {
    await startTheCall(IntakeClient)
    await act(async () => {
      socket("streaming").deliverJson({
        type: "Begin",
        id: "b",
        expires_at: 0,
        configuration: { model: "universal-3-5-pro" },
      })
    })
    await advance(0)
    const telemetry = screen.getByRole("region", { name: "Telemetry" })
    expect(within(telemetry).getByText("universal-3-5-pro")).toBeTruthy()
    const reported = rig.requests.find(
      (entry) =>
        entry.url.endsWith("/turns") && String(entry.init?.body).includes("recognizer"),
    )
    expect(
      JSON.parse(String(reported?.init?.body)),
      "the model Begin reported has to reach the server, or the receipt cannot name it",
    ).toEqual({
      role: "recognizer",
      model: "universal-3-5-pro",
      expectedModel: "universal-3-5-pro",
    })
    expect(reported?.url).toBe("/api/sessions/srv-7/turns")
  })

  it("measures end of turn to first agent audio in this browser and shows n", async () => {
    await startTheCall(IntakeClient)
    await callerSays("Morphine")
    await act(async () => {
      socket("agents").deliverJson({ type: "reply.started", reply_id: "r-2" })
      socket("agents").deliverJson({ type: "reply.audio", data: "AAAA" })
    })
    await advance(0)
    const telemetry = screen.getByRole("region", { name: "Telemetry" })
    expect(within(telemetry).getByText(/n=\s*1/)).toBeTruthy()
  })
})
