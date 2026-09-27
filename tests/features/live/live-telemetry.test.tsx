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

describe("U6: the order panel is fed by the product path, with no technical panel on the call page", () => {
  it("shows the commit block from real responses and binds the session on main", async () => {
    rig.route = (url) =>
      url.endsWith("/turns")
        ? json({ turnsHeld: 1, candidates: [LASA], decisions: [LASA_DECISION] })
        : undefined
    await startTheCall(IntakeClient)
    await act(async () => {
      socket("agents").deliverJson({ type: "reply.started", reply_id: "r-1" })
    })
    await callerSays("Morphine")
    expect(
      screen.queryByRole("region", { name: "Telemetry" }),
      "socket frames, the decision log and latency readouts no longer sit on the call page",
    ).toBeNull()
    expect(screen.queryByText("Technical details")).toBeNull()
    expect(
      document.querySelector("main")?.getAttribute("data-session-id"),
      "the live harness reads the server-issued session id from main now that the panel is gone",
    ).toBe("srv-7")
    const order = screen.getByRole("region", { name: "Order summary" })
    expect(within(order).getByText("Commit blocked")).toBeTruthy()
    expect(
      within(order).getByText(/critical fields are unresolved: .*Drug name/),
      "the unresolved fields have to be named, not merely counted",
    ).toBeTruthy()
  })

  it("reports the recognizer model Begin reported to the server", async () => {
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
})
