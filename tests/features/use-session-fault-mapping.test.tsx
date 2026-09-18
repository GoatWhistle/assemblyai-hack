import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { MicrophoneFailureReason } from "@/audio/microphone"
import { SessionFault } from "@/features/intake/session-status"

let nextReason: MicrophoneFailureReason = MicrophoneFailureReason.Denied

vi.mock("@/audio/microphone", async () => {
  const actual =
    await vi.importActual<typeof import("@/audio/microphone")>("@/audio/microphone")
  return {
    ...actual,
    requestMicrophone: async () => {
      throw new actual.MicrophonePermissionError(new Error("synthetic"), nextReason)
    },
  }
})

const { useSession } = await import("@/features/intake/use-session")

function Harness() {
  const session = useSession()
  return (
    <div>
      <button type="button" onClick={() => void session.start()}>
        open the line
      </button>
      <output>{session.fault ?? "none"}</output>
    </div>
  )
}

async function openTheLine() {
  await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
  await act(async () => {
    await Promise.resolve()
  })
}

describe("useSession maps each getUserMedia failure to its own fault, not one shared bucket", () => {
  it("maps a permission refusal to MicrophoneDenied", async () => {
    nextReason = MicrophoneFailureReason.Denied
    render(<Harness />)
    await openTheLine()
    expect(screen.getByRole("status").textContent).toBe(SessionFault.MicrophoneDenied)
  })

  it("maps an absent device to MicrophoneAbsent, not to the denied bucket", async () => {
    nextReason = MicrophoneFailureReason.NoDevice
    render(<Harness />)
    await openTheLine()
    expect(screen.getByRole("status").textContent).toBe(SessionFault.MicrophoneAbsent)
  })

  it("maps a busy device to MicrophoneBusy", async () => {
    nextReason = MicrophoneFailureReason.DeviceBusy
    render(<Harness />)
    await openTheLine()
    expect(screen.getByRole("status").textContent).toBe(SessionFault.MicrophoneBusy)
  })

  it("maps an insecure context to InsecureContext", async () => {
    nextReason = MicrophoneFailureReason.InsecureContext
    render(<Harness />)
    await openTheLine()
    expect(screen.getByRole("status").textContent).toBe(SessionFault.InsecureContext)
  })
})
