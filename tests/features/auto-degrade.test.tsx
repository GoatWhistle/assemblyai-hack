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

describe("AutoDegrade reaches the recorded demonstration without a second click, but never silently", () => {
  it("renders nothing when there is no fault", () => {
    render(<AutoDegrade fault={null} />)
    expect(screen.queryByText(/recorded demonstration/i)).toBeNull()
  })

  it("renders nothing for a non-microphone fault, since that degradation path is specific to getUserMedia", () => {
    render(<AutoDegrade fault={SessionFault.TokenFailed} />)
    expect(screen.queryByText(/recorded demonstration/i)).toBeNull()
  })

  it("labels the destination as recorded, never as a live session", () => {
    render(<AutoDegrade fault={SessionFault.MicrophoneDenied} />)
    expect(
      screen.getByText(
        /recorded session, clearly labelled as recorded, never presented as live/i,
      ),
    ).not.toBeNull()
  })

  it("counts down visibly rather than jumping straight there", () => {
    render(<AutoDegrade fault={SessionFault.MicrophoneAbsent} />)
    expect(screen.getByText(new RegExp(`in ${AUTO_DEGRADE_SECONDS}s`))).not.toBeNull()
    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(screen.getByText(new RegExp(`in ${AUTO_DEGRADE_SECONDS - 1}s`))).not.toBeNull()
  })

  it("navigates to the demo page once the countdown reaches zero", () => {
    render(<AutoDegrade fault={SessionFault.MicrophoneBusy} onNavigate={navigate} />)
    for (let second = 0; second < AUTO_DEGRADE_SECONDS; second += 1) {
      act(() => {
        vi.advanceTimersByTime(1000)
      })
    }
    expect(
      navigate,
      "a judge with no microphone must reach the recorded run without finding a second control; the whole point of this component is that the dead end does not exist",
    ).toHaveBeenCalledWith(AUTO_DEGRADE_TARGET)
  })

  it("offers the destination as a real link, not a scripted button", () => {
    render(<AutoDegrade fault={SessionFault.InsecureContext} />)
    const link = screen.getByRole("link", { name: /watch it now/i })
    expect(
      link.getAttribute("href"),
      "a link survives a scripting failure, opens in a new tab and is announced as a destination; a button that calls a router does none of those and this is the one path a judge without a microphone depends on",
    ).toBe(AUTO_DEGRADE_TARGET)
  })

  it("cancels the countdown on Stay here and never navigates", async () => {
    vi.useRealTimers()
    render(<AutoDegrade fault={SessionFault.MicrophoneDenied} onNavigate={navigate} />)
    await userEvent.click(screen.getByRole("button", { name: /stay here/i }))
    expect(screen.queryByText(/recorded demonstration/i)).toBeNull()
    expect(
      navigate,
      "an operator who says stay here has overruled the automatic move; carrying on anyway would take the page away mid-decision",
    ).not.toHaveBeenCalled()
  })

  it("announces the countdown through a live region rather than a silent redirect", () => {
    render(<AutoDegrade fault={SessionFault.MicrophoneDenied} />)
    const note = screen.getByText(/moving to the recorded demonstration/i)
    expect(note.closest("output")?.getAttribute("aria-live")).toBe("polite")
  })
})
