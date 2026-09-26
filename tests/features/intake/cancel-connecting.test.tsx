import { act, fireEvent, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionPhase } from "@/features/intake/session-status"
import { createRig, renderSession, type SessionRig, settle, shown } from "./session-harness"

const mic = vi.hoisted(() => ({
  release: null as ((stream: MediaStream) => void) | null,
  stopped: 0,
  captures: 0,
}))

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: () =>
      new Promise<MediaStream>((resolve) => {
        mic.release = resolve
      }),
    startCapture: async () => {
      mic.captures += 1
      return {
        contextSampleRate: 48000,
        setSttMuted: () => undefined,
        stop: async () => undefined,
      }
    },
  }
})

const { useSession } = await import("@/features/intake/use-session")

const STREAM = {
  getTracks: () => [
    {
      stop: () => {
        mic.stopped += 1
      },
    },
  ],
} as unknown as MediaStream

let rig: SessionRig

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  mic.release = null
  mic.stopped = 0
  mic.captures = 0
  rig = createRig()
  globalThis.AudioContext = class {} as unknown as typeof AudioContext
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("connecting can be cancelled, and a cancelled start never opens the line", () => {
  it("returns to ready, releases the microphone and mints nothing when cancelled mid-permission", async () => {
    renderSession(useSession, rig)
    fireEvent.click(screen.getByRole("button", { name: /open the line/i }))
    await settle()
    expect(shown("phase")).toBe(SessionPhase.RequestingMicrophone)

    fireEvent.click(screen.getByRole("button", { name: /close the line/i }))
    await settle()
    expect(
      shown("phase"),
      "a cancelled connect is not a finished call, so the page goes back to Ready",
    ).toBe(SessionPhase.Idle)

    await act(async () => {
      mic.release?.(STREAM)
    })
    await settle()
    expect(
      shown("phase"),
      "a permission granted after the cancel must not reopen the line behind the caller's back (r1-A3 A3-03)",
    ).toBe(SessionPhase.Idle)
    expect(mic.stopped, "the late stream is released rather than left recording").toBe(1)
    expect(rig.tokenRequests, "nothing is minted for a cancelled start").toEqual([])
    expect(rig.sockets).toHaveLength(0)
    expect(mic.captures).toBe(0)
  })
})
