import { act, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { CLIENT_SHARE_EXPLANATION } from "@/domain"
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

const { IntakeClient } = await import("@app/(pages)/live/intake-client")

beforeEach(resetRig)
afterEach(releaseRig)

describe("T6: an exhausted budget moves the visitor to the replay before the microphone", () => {
  it("never asks for the microphone and explains whose credit ran out", async () => {
    rig.route = (url) =>
      url === "/api/budget"
        ? json({
            budget: { remainingSeconds: 0, exhausted: true },
            explanation: "the daily cap is reached",
          })
        : undefined
    await startTheCall(IntakeClient)
    expect(rig.microphoneRequests).toBe(0)
    expect(screen.getByText(/the daily cap is reached/)).toBeTruthy()
    expect(screen.getAllByText(/live-call budget refused this call/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/project's own credit, never yours/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/moving to the replay demonstration/i)).toBeTruthy()
  })

  it("reads the budget refusal on the token route the same way", async () => {
    rig.route = (url) =>
      url.startsWith("/api/tokens/")
        ? json({ code: "E_DAILY_BUDGET_EXHAUSTED", error: "spent" }, 429)
        : undefined
    await startTheCall(IntakeClient)
    expect(screen.getAllByText(/live-call budget refused this call/i).length).toBeGreaterThan(0)
  })

  it("names the per-client share when that is the cap that refused, not the daily total", async () => {
    rig.route = (url) =>
      url.startsWith("/api/tokens/")
        ? json(
            {
              code: "E_DAILY_BUDGET_EXHAUSTED",
              error: "this client's share of the daily budget is spent",
              explanation: CLIENT_SHARE_EXPLANATION,
            },
            429,
          )
        : undefined
    await startTheCall(IntakeClient)
    expect(
      screen.getByText(CLIENT_SHARE_EXPLANATION, { exact: false }),
      "a visitor refused by their own share must not be told the whole day's budget is gone",
    ).toBeTruthy()
    expect(screen.queryByText(/today's live-call budget is spent/i)).toBeNull()
  })

  it("shows the server's own reason when the token route fails with 500", async () => {
    rig.route = (url) =>
      url.startsWith("/api/tokens/")
        ? json({ error: "the deployment has no public URL for the agent's tools" }, 500)
        : undefined
    await startTheCall(IntakeClient)
    expect(screen.getByText(/no public URL for the agent's tools/)).toBeTruthy()
    expect(screen.getByText("HTTP 500")).toBeTruthy()
  })
})

describe("H12: no failure is replaced by a made-up answer", () => {
  it("shows an agent error frame as an error and speaks nothing in its place", async () => {
    await startTheCall(IntakeClient)
    await act(async () => {
      socket("agents").deliverJson({
        type: "error",
        error: { code: "tool_failed", message: "proposeField returned 500" },
      })
    })
    await advance(0)
    expect(screen.getByText(/the agent reported an error/i)).toBeTruthy()
    expect(screen.getByText("tool_failed")).toBeTruthy()
    expect(
      rig.requests.filter((entry) => entry.url.endsWith("/turns")),
      "an error must not become an agent turn the server could take as a read-back",
    ).toEqual([])
  })

  it("shows a refused caller turn as an alert instead of an empty order", async () => {
    rig.route = (url) =>
      url.endsWith("/turns") ? json({ error: "no registered session srv-7" }, 404) : undefined
    await startTheCall(IntakeClient)
    await callerSays("Morphine")
    expect(screen.getByRole("alert").textContent).toContain("no registered session srv-7")
  })

  it("shows an unreachable server as an alert", async () => {
    rig.route = (url) => {
      if (url.endsWith("/turns")) {
        throw new TypeError("network down")
      }
      return undefined
    }
    await startTheCall(IntakeClient)
    await callerSays("Morphine")
    expect(screen.getByRole("alert").textContent).toMatch(/could not be sent to the server/i)
  })

  it("shows a refused finalise as an alert rather than a silent loss", async () => {
    rig.route = (url) =>
      url.endsWith("/finalize") ? json({ error: "storage down" }, 503) : undefined
    await startTheCall(IntakeClient)
    fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    await advance(5000)
    expect(screen.getByRole("alert").textContent).toMatch(/could not be stored: 503/)
  })
})

describe("the finished session is handed to the server on the product path", () => {
  it("finalises the server-issued session once, after both sockets closed", async () => {
    await startTheCall(IntakeClient)
    fireEvent.click(screen.getByRole("button", { name: /stop/i }))
    await act(async () => {
      socket("agents").deliverJson({ type: "session.ended" })
      socket("streaming").deliverJson({
        type: "Termination",
        audio_duration_seconds: 1,
        session_duration_seconds: 1,
      })
    })
    await advance(5000)
    const finalized = rig.requests.filter((entry) => entry.url.endsWith("/finalize"))
    expect(finalized.map((entry) => entry.url)).toEqual(["/api/sessions/srv-7/finalize"])
    expect(finalized[0]?.init?.method).toBe("POST")
  })
})
