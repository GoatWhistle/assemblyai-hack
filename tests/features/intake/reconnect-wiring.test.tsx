import { act, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionFault, SessionPhase } from "@/features/intake/session-status"
import {
  createRig,
  latestSocket,
  openTheLine,
  renderSession,
  type SessionRig,
  sentTypes,
  settle,
  shown,
  socketCount,
} from "./session-harness"

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
    startCapture: async () => ({
      contextSampleRate: 48000,
      setSttMuted: () => undefined,
      stop: async () => undefined,
    }),
  }
})

const { useSession } = await import("@/features/intake/use-session")

const ABNORMAL = 1006

let rig: SessionRig

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  rig = createRig()
  globalThis.AudioContext = class {} as unknown as typeof AudioContext
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("T8: the product path calls reconnect on an unexpected close", () => {
  it("reconnects a dropped agent socket once, under the same session, with a new token", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const first = latestSocket(rig, "agents")
    await act(async () => {
      first.close(ABNORMAL, "")
    })
    await settle()
    expect(rig.tokenRequests).toContain("/api/tokens/agent?sessionId=server-session-1")
    expect(socketCount(rig, "agents")).toBe(2)
    const second = rig.sockets.filter((s) => s.url.includes("agents.us.assemblyai.com"))[1]
    expect(second?.url, "a single-use token must never be reused").not.toContain(
      new URL(rig.sockets[0]?.url ?? "wss://x").searchParams.get("token") ?? "none",
    )
    expect(shown("phase")).toBe(SessionPhase.Live)
    expect(shown("fault")).toBe("none")
  })

  it("mints a fresh STT token when the recognizer socket drops", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const before = rig.tokenRequests.filter((url) => url === "/api/tokens/stt").length
    await act(async () => {
      latestSocket(rig, "streaming").close(ABNORMAL, "")
    })
    await settle()
    expect(rig.tokenRequests.filter((url) => url === "/api/tokens/stt").length).toBe(before + 1)
    expect(socketCount(rig, "streaming")).toBe(2)
  })

  it("shows reconnecting while the new token is being minted", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    act(() => {
      latestSocket(rig, "agents").close(ABNORMAL, "")
    })
    expect(shown("phase")).toBe(SessionPhase.Reconnecting)
    await settle()
    expect(shown("phase")).toBe(SessionPhase.Live)
  })

  it("stops as degraded when the reconnected socket drops a second time", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await act(async () => {
      latestSocket(rig, "agents").close(ABNORMAL, "")
    })
    await settle()
    const stt = latestSocket(rig, "streaming")
    await act(async () => {
      latestSocket(rig, "agents").close(ABNORMAL, "")
    })
    expect(sentTypes(stt), "degrading still closes the other socket").toContain("Terminate")
    await act(async () => {
      stt.deliverJson({ type: "Termination" })
    })
    await settle()
    expect(shown("phase")).toBe(SessionPhase.Degraded)
    expect(shown("fault")).toBe(SessionFault.ReconnectFailed)
    expect(socketCount(rig, "agents"), "one reconnect, never a loop").toBe(2)
  })

  it("does not reconnect after a normal end", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const agent = latestSocket(rig, "agents")
    const stt = latestSocket(rig, "streaming")
    const minted = rig.tokenRequests.length
    fireEvent.click(screen.getByRole("button", { name: /close the line/i }))
    await act(async () => {
      agent.deliverJson({ type: "session.ended" })
      stt.deliverJson({ type: "Termination" })
    })
    await settle()
    expect(shown("phase")).toBe(SessionPhase.Closed)
    expect(rig.tokenRequests.length, "a clean close must not mint anything").toBe(minted)
    expect(shown("fault")).toBe("none")
  })

  it("does not reconnect when the server closes after session.ended", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const minted = rig.tokenRequests.length
    await act(async () => {
      const agent = latestSocket(rig, "agents")
      agent.deliverJson({ type: "session.ended" })
      agent.close(ABNORMAL, "")
    })
    await settle()
    expect(rig.tokenRequests.length).toBe(minted)
  })
})
