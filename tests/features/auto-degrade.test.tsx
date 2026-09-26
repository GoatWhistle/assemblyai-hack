import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { SessionFault } from "@/features/intake/session-status"

const navigate = vi.fn()

const { AutoDegrade, AUTO_DEGRADE_SECONDS, AUTO_DEGRADE_TARGET } = await import(
  "@/features/intake/auto-degrade"
)

beforeEach(() => {
  vi.useFakeTimers()
  navigate.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

function runOut() {
  for (let second = 0; second < AUTO_DEGRADE_SECONDS; second += 1) {
    act(() => {
      vi.advanceTimersByTime(1000)
    })
  }
}

describe("AutoDegrade reaches the replay when no retry can work today, but never silently", () => {
  it("renders nothing when there is no fault", () => {
    render(<AutoDegrade fault={null} />)
    expect(screen.queryByText(/replay demonstration/i)).toBeNull()
  })

  it("renders nothing for a fault a retry can fix, such as the concurrency limit", () => {
    render(<AutoDegrade fault={SessionFault.ConcurrencyReached} />)
    expect(screen.queryByText(/replay demonstration/i)).toBeNull()
  })

  for (const fault of [
    SessionFault.MicrophoneDenied,
    SessionFault.MicrophoneAbsent,
    SessionFault.MicrophoneBusy,
    SessionFault.InsecureContext,
    SessionFault.CaptureFailed,
    SessionFault.TokenFailed,
  ]) {
    it(`never leaves the call page on its own for ${fault}`, () => {
      render(<AutoDegrade fault={fault} onNavigate={navigate} />)
      runOut()
      expect(
        navigate,
        "a caller who refused the microphone by accident was moved off the call page after 9 s, with the countdown off-screen on a phone, before reading why (r1-A3 A3-01)",
      ).not.toHaveBeenCalled()
      expect(screen.queryByText(/moving to the replay/i)).toBeNull()
    })
  }

  for (const fault of [SessionFault.BudgetExhausted, SessionFault.CreditsExhausted]) {
    it(`T6: moves to the replay on ${fault}, which no retry can fix today`, () => {
      render(<AutoDegrade fault={fault} onNavigate={navigate} />)
      runOut()
      expect(navigate).toHaveBeenCalledWith(AUTO_DEGRADE_TARGET)
    })
  }

  it("labels the destination as a synthesised replay, never as a live session", () => {
    render(<AutoDegrade fault={SessionFault.BudgetExhausted} />)
    expect(
      screen.getByText(
        /replays a synthesised session,\s+clearly labelled as a replay, never presented as live/i,
      ),
    ).not.toBeNull()
  })

  it("counts down visibly rather than jumping straight there", () => {
    render(<AutoDegrade fault={SessionFault.CreditsExhausted} />)
    expect(screen.getByText(new RegExp(`in ${AUTO_DEGRADE_SECONDS}s`))).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(new RegExp(`in ${AUTO_DEGRADE_SECONDS - 1}s`))).not.toBeNull()
  })

  it("offers the destination as a real link, not a scripted button", () => {
    render(<AutoDegrade fault={SessionFault.BudgetExhausted} />)
    const link = screen.getByRole("link", { name: /watch it now/i })
    expect(
      link.getAttribute("href"),
      "a link survives a scripting failure, opens in a new tab and is announced as a destination; a button that calls a router does none of those",
    ).toBe(AUTO_DEGRADE_TARGET)
  })

  it("cancels the countdown on Stay here, never navigates, and keeps the way to the replay", async () => {
    vi.useRealTimers()
    render(<AutoDegrade fault={SessionFault.BudgetExhausted} onNavigate={navigate} />)
    await userEvent.click(screen.getByRole("button", { name: /stay here/i }))
    expect(screen.queryByText(/replay demonstration/i)).toBeNull()
    expect(screen.getByRole("link", { name: /watch it now/i })).not.toBeNull()
    expect(
      navigate,
      "an operator who says stay here has overruled the automatic move; carrying on anyway would take the page away mid-decision",
    ).not.toHaveBeenCalled()
  })

  it("announces the countdown through a live region rather than a silent redirect", () => {
    render(<AutoDegrade fault={SessionFault.BudgetExhausted} />)
    const note = screen.getByText(/moving to the replay demonstration/i)
    expect(note.closest("output")?.getAttribute("aria-live")).toBe("polite")
  })
})
