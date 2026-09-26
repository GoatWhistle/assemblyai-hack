import { render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { IntakeScreen } from "@/features/intake/intake-screen"
import { PAUSED_BODY, PAUSED_TITLE } from "@/features/intake/intake-screen/fault-panel"
import { PAUSED_LABEL } from "@/features/intake/phase-dot"
import { FAULT_COPY, SessionFault, SessionPhase } from "@/features/intake/session-status"
import {
  CONNECT_WINDOW_MS,
  ConnectTimedOut,
  connectWithin,
} from "@/features/intake/session-timers"
import { faultForConnectError } from "@/features/intake/start-faults"
import { TOUCH_CANCEL_HINT } from "@/features/microphone/key-hint"
import { MicConsole } from "@/features/microphone/mic-console"
import { MicState } from "@/features/microphone/mic-state"
import { initialContext } from "@/features/read-back/read-back-machine"

afterEach(() => {
  vi.useRealTimers()
})

describe("r2-A3 A3R2-01: a hung connection turns into the restartable fault card", () => {
  it("rejects with ConnectTimedOut once the window passes", async () => {
    vi.useFakeTimers()
    const pending = connectWithin(new Promise<void>(() => undefined))
    const caught = pending.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(CONNECT_WINDOW_MS)
    const error = await caught
    expect(error).toBeInstanceOf(ConnectTimedOut)
    expect(faultForConnectError(error)).toBe(SessionFault.ConnectTimedOut)
    expect(FAULT_COPY[SessionFault.ConnectTimedOut].remedy).toMatch(/try again/i)
  })

  it("passes a connection that opens in time straight through", async () => {
    vi.useFakeTimers()
    const opened = connectWithin(Promise.resolve("open"))
    await vi.advanceTimersByTimeAsync(0)
    await expect(opened).resolves.toBe("open")
  })

  it("names the cancel on screen while connecting, for a touch screen with no Escape key", () => {
    render(<MicConsole state={MicState.Opening} level={0} elapsedMs={0} echoDiscards={0} />)
    expect(screen.getByText(TOUCH_CANCEL_HINT)).toBeTruthy()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy()
  })
})

describe("r2-A3 A3R2-06: a spent budget is shown before anyone presses the microphone", () => {
  it("says live calls are paused, offers the replay and keeps the microphone inert", () => {
    const onStart = vi.fn()
    render(
      <IntakeScreen
        candidates={[]}
        decisions={new Map()}
        transcript={[]}
        readBack={initialContext()}
        phase={SessionPhase.Idle}
        fault={null}
        budgetPaused={{ code: "E_DAILY_BUDGET_EXHAUSTED", message: "the daily cap is reached" }}
        echoDiscards={0}
        level={0}
        agentSpeaking={false}
        elapsedMs={0}
        onStart={onStart}
      />,
    )
    expect(screen.getByText(PAUSED_LABEL)).toBeTruthy()
    const notice = screen.getByRole("region", { name: PAUSED_TITLE })
    expect(within(notice).getByText(PAUSED_BODY)).toBeTruthy()
    expect(within(notice).getByRole("link", { name: "Watch the replay" })).toBeTruthy()
    const mic = screen.getByRole("button", { name: "Start listening" })
    expect(mic.getAttribute("aria-disabled")).toBe("true")
    mic.click()
    expect(onStart).not.toHaveBeenCalled()
    expect(screen.queryByText(/for example/i)).toBeNull()
  })
})
