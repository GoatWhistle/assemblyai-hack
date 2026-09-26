import { act, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionFault, SessionPhase } from "@/features/intake/session-status"
import { IDLE_END_MS, REPLY_STALL_MS } from "@/features/intake/session-timers"
import {
  createRig,
  latestSocket,
  openTheLine,
  renderSession,
  type SessionRig,
  sentTypes,
  settle,
  shown,
} from "./session-harness"

const mic = vi.hoisted(() => ({ muted: [] as boolean[] }))

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => ({ getTracks: () => [] }) as unknown as MediaStream,
    startCapture: async () => ({
      contextSampleRate: 48000,
      setSttMuted: (muted: boolean) => mic.muted.push(muted),
      stop: async () => undefined,
    }),
  }
})

vi.mock("@/audio/playback", () => ({
  createPlayback: () => ({
    enqueue: () => undefined,
    flush: () => undefined,
    close: async () => undefined,
    beginReply: () => undefined,
    settleReply: async () => ({ playedMs: 0, durationMs: 0 }),
    scheduledCount: 0,
  }),
}))

const { useSession } = await import("@/features/intake/use-session")

let rig: SessionRig

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  mic.muted.length = 0
  rig = createRig()
  globalThis.AudioContext = class {} as unknown as typeof AudioContext
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("T9: a reply that never finishes cannot leave the microphone deaf", () => {
  it("keeps the recognizer open through a reply's silent tool calls and mutes at its first audio", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await act(async () => {
      latestSocket(rig, "agents").deliverJson({ type: "reply.started", reply_id: "r1" })
    })
    expect(mic.muted, "the caller may still be talking while the agent calls tools").toEqual([])
    await act(async () => {
      latestSocket(rig, "agents").deliverJson({ type: "audio", audio: "AAAA" })
      latestSocket(rig, "agents").deliverJson({ type: "audio", audio: "AAAA" })
    })
    expect(mic.muted, "muted once, when the agent became audible").toEqual([true])
  })

  it("unmutes capture and surfaces a fault 20 s after the last reply audio with no reply.done", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await act(async () => {
      latestSocket(rig, "agents").deliverJson({ type: "reply.started", reply_id: "r1" })
      latestSocket(rig, "agents").deliverJson({ type: "audio", audio: "AAAA" })
    })
    expect(mic.muted).toEqual([true])
    await settle(REPLY_STALL_MS - 1)
    expect(shown("fault")).toBe("none")
    await settle(1)
    expect(mic.muted, "the watchdog must reopen the recognizer path").toEqual([true, false])
    expect(shown("fault")).toBe(SessionFault.ReplyStalled)
    expect(shown("phase"), "the stall is advisory; the call goes on").toBe(SessionPhase.Live)
  })

  it("stays quiet when reply.done arrives in time", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await act(async () => {
      latestSocket(rig, "agents").deliverJson({ type: "reply.started", reply_id: "r1" })
    })
    await settle(REPLY_STALL_MS / 2)
    await act(async () => {
      latestSocket(rig, "agents").deliverJson({ type: "reply.done", status: "completed" })
    })
    await settle(REPLY_STALL_MS)
    expect(shown("fault")).toBe("none")
  })
})

describe("starting again while a call is open", () => {
  it("closes the open sockets before opening new ones, so two sessions never bill at once", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const agent = latestSocket(rig, "agents")
    const stt = latestSocket(rig, "streaming")
    fireEvent.click(screen.getByRole("button", { name: /open the line/i }))
    await act(async () => {
      agent.deliverJson({ type: "session.ended" })
      stt.deliverJson({ type: "Termination" })
    })
    await settle()
    expect(sentTypes(agent)).toContain("session.end")
    expect(sentTypes(stt)).toContain("Terminate")
    expect(agent.isOpen || stt.isOpen).toBe(false)
    expect(latestSocket(rig, "agents")).not.toBe(agent)
    expect(shown("phase")).toBe(SessionPhase.Live)
  })
})

describe("T10: an idle line is closed after 90 seconds, through the confirmed end path", () => {
  it("sends session.end and Terminate, then waits for both confirmations", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const agent = latestSocket(rig, "agents")
    const stt = latestSocket(rig, "streaming")
    await settle(IDLE_END_MS)
    expect(sentTypes(agent)).toContain("session.end")
    expect(sentTypes(stt)).toContain("Terminate")
    expect(shown("phase"), "no close is final until both sockets confirm").toBe(
      SessionPhase.Closing,
    )
    await act(async () => {
      agent.deliverJson({ type: "session.ended" })
      stt.deliverJson({ type: "Termination" })
    })
    await settle()
    expect(shown("phase")).toBe(SessionPhase.Closed)
    expect(shown("fault")).toBe(SessionFault.IdleEnded)
  })

  it("restarts the count when the caller speaks", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await settle(IDLE_END_MS - 10000)
    await act(async () => {
      latestSocket(rig, "streaming").deliverJson({
        type: "Turn",
        turn_order: 0,
        turn_is_formatted: false,
        end_of_turn: false,
        transcript: "lisinopril",
        end_of_turn_confidence: 0.2,
        words: [],
      })
    })
    await settle(IDLE_END_MS - 10000)
    expect(sentTypes(latestSocket(rig, "agents"))).not.toContain("session.end")
    await settle(10000)
    expect(sentTypes(latestSocket(rig, "agents"))).toContain("session.end")
  })
})

describe("T1: the actual recognizer model reaches the session", () => {
  it("exposes the model Begin reported", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    await act(async () => {
      latestSocket(rig, "streaming").deliverJson({
        type: "Begin",
        id: "b",
        expires_at: 0,
        configuration: { model: "universal-3-5-pro" },
      })
    })
    expect(shown("model")).toBe("universal-3-5-pro")
    expect(shown("fault")).toBe("none")
  })

  it("ends the whole session with a visible fault on a model mismatch", async () => {
    renderSession(useSession, rig)
    await openTheLine()
    const agent = latestSocket(rig, "agents")
    await act(async () => {
      latestSocket(rig, "streaming").deliverJson({
        type: "Begin",
        id: "b",
        expires_at: 0,
        configuration: { model: "universal-3-pro" },
      })
    })
    expect(shown("fault")).toBe(SessionFault.ModelMismatch)
    expect(shown("model")).toBe("universal-3-pro")
    expect(sentTypes(agent), "the agent socket must not keep billing alone").toContain(
      "session.end",
    )
    expect(rig.tokenRequests, "a deliberate close is not a drop to reconnect").toHaveLength(2)
  })
})
