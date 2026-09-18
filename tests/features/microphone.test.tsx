import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { isMicrophoneFault, SessionFault, SessionPhase } from "@/features/intake/session-status"
import {
  BAR_COUNT,
  barHeights,
  REST_LEVEL,
  shiftHistory,
} from "@/features/microphone/level-meter"
import { MicConsole } from "@/features/microphone/mic-console"
import {
  isBusy,
  isOpen,
  MIC_COPY,
  MicState,
  micStateFor,
} from "@/features/microphone/mic-state"
import { MicKeyAction, micKeyAction } from "@/features/microphone/use-mic-keys"

function renderConsole(overrides: Partial<Parameters<typeof MicConsole>[0]> = {}) {
  return render(
    <MicConsole
      state={MicState.Idle}
      level={0}
      elapsedMs={0}
      echoDiscards={0}
      onStart={() => {}}
      onStop={() => {}}
      {...overrides}
    />,
  )
}

describe("micStateFor", () => {
  it("shows the idle invitation before anything starts", () => {
    expect(micStateFor(SessionPhase.Idle, false, null)).toBe(MicState.Idle)
  })

  it("distinguishes listening from the agent speaking while both are live", () => {
    expect(micStateFor(SessionPhase.Live, false, null)).toBe(MicState.Listening)
    expect(micStateFor(SessionPhase.Live, true, null)).toBe(MicState.AgentSpeaking)
  })

  it("treats requesting the microphone and minting tokens as one opening state", () => {
    expect(micStateFor(SessionPhase.RequestingMicrophone, false, null)).toBe(MicState.Opening)
    expect(micStateFor(SessionPhase.MintingTokens, false, null)).toBe(MicState.Opening)
  })

  it("lets a fault outrank every other phase", () => {
    expect(micStateFor(SessionPhase.Live, true, SessionFault.MicrophoneDenied)).toBe(
      MicState.Blocked,
    )
  })

  it("blocks on every one of the four distinct microphone faults, not only on denial", () => {
    for (const fault of [
      SessionFault.MicrophoneDenied,
      SessionFault.MicrophoneAbsent,
      SessionFault.MicrophoneBusy,
      SessionFault.InsecureContext,
    ]) {
      expect(micStateFor(SessionPhase.Blocked, false, fault)).toBe(MicState.Blocked)
    }
  })
})

describe("isMicrophoneFault", () => {
  it("recognises all four microphone-class faults", () => {
    for (const fault of [
      SessionFault.MicrophoneDenied,
      SessionFault.MicrophoneAbsent,
      SessionFault.MicrophoneBusy,
      SessionFault.InsecureContext,
    ]) {
      expect(isMicrophoneFault(fault)).toBe(true)
    }
  })

  it("excludes faults that have nothing to do with getUserMedia", () => {
    for (const fault of [
      SessionFault.TokenFailed,
      SessionFault.SocketDropped,
      SessionFault.CreditsExhausted,
      SessionFault.ConcurrencyReached,
    ]) {
      expect(isMicrophoneFault(fault)).toBe(false)
    }
  })

  it("treats no fault as not a microphone fault", () => {
    expect(isMicrophoneFault(null)).toBe(false)
  })

  it("marks only the transitional states busy", () => {
    expect(isBusy(MicState.Opening)).toBe(true)
    expect(isBusy(MicState.Closing)).toBe(true)
    expect(isBusy(MicState.Listening)).toBe(false)
    expect(isOpen(MicState.AgentSpeaking)).toBe(true)
    expect(isOpen(MicState.Idle)).toBe(false)
  })
})

const silence: readonly number[] = Array.from({ length: BAR_COUNT }, () => REST_LEVEL)

describe("level meter", () => {
  it("renders a fixed number of discrete bars rather than one breathing shape", () => {
    expect(barHeights(silence)).toHaveLength(BAR_COUNT)
  })

  it("keeps every bar visible at silence so the meter reads as an instrument at rest", () => {
    for (const height of barHeights(silence)) {
      expect(height).toBeGreaterThan(0)
    }
  })

  it("scrolls the history rightwards, so the meter is a waveform and not a pattern", () => {
    const shifted = shiftHistory(silence, 0.9)
    expect(shifted).toHaveLength(BAR_COUNT)
    expect(shifted.at(-1)).toBeCloseTo(0.9, 5)
    expect(shifted.at(0)).toBeCloseTo(REST_LEVEL, 5)
  })

  it("carries a loud sample through several frames instead of forgetting it", () => {
    let history = shiftHistory(silence, 0.9)
    history = shiftHistory(history, REST_LEVEL)
    history = shiftHistory(history, REST_LEVEL)
    expect(history.at(-3)).toBeCloseTo(0.9, 5)
  })

  it("clamps a sample outside the unit range rather than overflowing the track", () => {
    expect(shiftHistory(silence, 4).at(-1)).toBe(1)
    expect(shiftHistory(silence, -2).at(-1)).toBeCloseTo(REST_LEVEL, 5)
    for (const height of barHeights(Array.from({ length: BAR_COUNT }, () => 1))) {
      expect(height).toBeLessThanOrEqual(1)
    }
  })

  it("tapers the edges so the waveform reads as centred", () => {
    const loud = Array.from({ length: BAR_COUNT }, () => 1)
    const heights = barHeights(loud)
    const middle = Math.floor(BAR_COUNT / 2)
    expect(heights[middle] ?? 0).toBeGreaterThan(heights[0] ?? 0)
  })
})

describe("mic console", () => {
  it("offers one obvious action when idle", async () => {
    const onStart = vi.fn()
    renderConsole({ onStart })
    await userEvent.click(screen.getByRole("button", { name: /start listening/i }))
    expect(onStart).toHaveBeenCalledOnce()
  })

  it("explains that the closed microphone during playback is deliberate", () => {
    renderConsole({ state: MicState.AgentSpeaking })
    expect(screen.getByText(MIC_COPY[MicState.AgentSpeaking].detail)).not.toBeNull()
  })

  it("disables the trigger while the line is opening rather than queueing clicks", async () => {
    const onStart = vi.fn()
    renderConsole({ state: MicState.Opening, onStart })
    const trigger = screen.getByRole("button", { name: /opening/i })
    expect((trigger as HTMLButtonElement).disabled).toBe(true)
    await userEvent.click(trigger)
    expect(onStart).not.toHaveBeenCalled()
  })

  it("starts and stops from the space bar", async () => {
    const onStart = vi.fn()
    const onStop = vi.fn()
    const { unmount } = renderConsole({ onStart })
    await userEvent.keyboard(" ")
    expect(onStart).toHaveBeenCalledOnce()
    unmount()

    renderConsole({ state: MicState.Listening, onStop })
    await userEvent.keyboard(" ")
    expect(onStop).toHaveBeenCalledOnce()
  })

  it("stops on escape only while the line is open", async () => {
    const onStop = vi.fn()
    const { unmount } = renderConsole({ state: MicState.Idle, onStop })
    await userEvent.keyboard("{Escape}")
    expect(onStop).not.toHaveBeenCalled()
    unmount()

    renderConsole({ state: MicState.Listening, onStop })
    await userEvent.keyboard("{Escape}")
    expect(onStop).toHaveBeenCalledOnce()
  })

  it("reports elapsed time and discarded echo turns as data, not decoration", () => {
    renderConsole({ state: MicState.Listening, elapsedMs: 95000, echoDiscards: 2 })
    expect(screen.getByText("1:35")).not.toBeNull()
    expect(screen.getByText("2")).not.toBeNull()
  })

  it("announces the level for a screen reader instead of leaving the meter silent", () => {
    renderConsole({ state: MicState.Listening, level: 0.42 })
    expect(screen.getByLabelText(/input level 42 of 100/i)).not.toBeNull()
  })
})

describe("micKeyAction", () => {
  it("starts on space when idle and stops on space when open", () => {
    expect(micKeyAction(" ", "Space", { busy: false, open: false })).toBe(MicKeyAction.Start)
    expect(micKeyAction(" ", "Space", { busy: false, open: true })).toBe(MicKeyAction.Stop)
  })

  it("ignores space while the line is opening or closing", () => {
    expect(micKeyAction(" ", "Space", { busy: true, open: false })).toBe(MicKeyAction.Ignore)
    expect(micKeyAction(" ", "Space", { busy: true, open: true })).toBe(MicKeyAction.Ignore)
  })

  it("stops on escape only when the line is open", () => {
    expect(micKeyAction("Escape", "Escape", { busy: false, open: true })).toBe(
      MicKeyAction.Stop,
    )
    expect(micKeyAction("Escape", "Escape", { busy: false, open: false })).toBe(
      MicKeyAction.Ignore,
    )
  })

  it("ignores every other key", () => {
    for (const key of ["a", "Enter", "Tab", "ArrowUp"]) {
      expect(micKeyAction(key, `Key${key}`, { busy: false, open: true })).toBe(
        MicKeyAction.Ignore,
      )
    }
  })
})
