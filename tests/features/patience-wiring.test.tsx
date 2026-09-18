import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FieldName } from "@/domain"
import { MicConsole } from "@/features/microphone/mic-console"
import { MicState } from "@/features/microphone/mic-state"
import { PATIENCE, PatienceName } from "@/realtime/patience"
import { MemoryTransport, type TransportFactory } from "@/realtime/transport"

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

let sockets: MemoryTransport[] = []

const factory: TransportFactory = (_url, listeners) => {
  const transport = new MemoryTransport(listeners)
  sockets.push(transport)
  queueMicrotask(() => transport.acceptOpen())
  return transport
}

function framesOfType(type: string): Record<string, unknown>[] {
  return sockets.flatMap((socket) => socket.sentJson()).filter((frame) => frame.type === type)
}

type HarnessProps = {
  readonly field: FieldName | null
  readonly awaitingConfirmation?: boolean
}

let finish: (() => void) | null = null
let switches = 0

function Harness({ field, awaitingConfirmation = false }: HarnessProps) {
  const session = useSession({
    transport: factory,
    solicited: { field, awaitingConfirmation },
  })
  finish = session.finishAnswer
  switches = session.patienceSwitches
  return (
    <div>
      <button type="button" onClick={() => void session.start()}>
        open the line
      </button>
      <MicConsole
        state={session.phase === "live" ? MicState.Listening : MicState.Idle}
        level={0}
        elapsedMs={0}
        echoDiscards={0}
        patience={session.patience}
        onFinishAnswer={session.finishAnswer}
      />
    </div>
  )
}

beforeEach(() => {
  sockets = []
  finish = null
  switches = 0
  globalThis.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ token: "token-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
  ) as unknown as typeof fetch
})

afterEach(() => {
  vi.restoreAllMocks()
})

async function openTheLine() {
  await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
  await act(async () => {
    await Promise.resolve()
  })
}

describe("UpdateConfiguration is sent by the product, not merely callable", () => {
  it("patches the live recognizer socket when the solicited field changes", async () => {
    const view = render(<Harness field={FieldName.PatientName} />)
    await openTheLine()
    expect(
      framesOfType("UpdateConfiguration").length,
      "the opening preset never went out",
    ).toBe(1)

    view.rerender(<Harness field={FieldName.PrescriberNpi} />)
    await act(async () => {
      await Promise.resolve()
    })

    const patches = framesOfType("UpdateConfiguration")
    expect(
      patches.length,
      "a change of solicited field must patch the socket that is already open",
    ).toBe(2)
    expect(patches[1]?.min_turn_silence).toBe(PATIENCE[PatienceName.Dictated].minSilence)
    expect(patches[1]?.max_turn_silence).toBe(PATIENCE[PatienceName.Dictated].maxSilence)
  })

  it("patches without opening a second socket, because the point is a live patch", async () => {
    const view = render(<Harness field={FieldName.PatientName} />)
    await openTheLine()
    const opened = sockets.length
    view.rerender(<Harness field={FieldName.PrescriberDea} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(
      sockets.length,
      "a reconnect would mint a fresh token and lose the turn in flight",
    ).toBe(opened)
    expect(sockets.every((socket) => socket.isOpen)).toBe(true)
  })

  it("does not resend the same preset when two fields share one", async () => {
    const view = render(<Harness field={FieldName.PrescriberNpi} />)
    await openTheLine()
    view.rerender(<Harness field={FieldName.PrescriberDea} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(
      framesOfType("UpdateConfiguration").length,
      "NPI and DEA are both dictated; patching twice is chatter on a paid socket",
    ).toBe(1)
  })

  it("patches the agent socket too, since both sockets hold their own turn detection", async () => {
    render(<Harness field={FieldName.PrescriberNpi} />)
    await openTheLine()
    const updates = framesOfType("session.update")
    const last = updates.at(-1)?.session as
      | { input?: { turn_detection?: Record<string, unknown> } }
      | undefined
    const sent = last?.input?.turn_detection
    expect(
      sent?.vad_threshold,
      "the agent socket still gets its own turn detection patched per field; only the two fields that disable the vendor's entity-aware waiting are withheld",
    ).toBe(PATIENCE[PatienceName.Dictated].vadThreshold)
    for (const field of ["min_silence", "max_silence"]) {
      expect(
        sent !== undefined && Object.hasOwn(sent, field),
        `${field} on the live agent socket would re-trigger the documented disabling of adaptive pacing and entity-aware waiting, on the first field switch of every call. This field is the dictated-identifier case, which is the one the vendor feature protects`,
      ).toBe(false)
    }
  })

  it("counts the switches it made, so a dead patch shows as a zero on screen", async () => {
    const view = render(<Harness field={FieldName.Route} />)
    await openTheLine()
    view.rerender(<Harness field={FieldName.PrescriberNpi} />)
    await act(async () => {
      await Promise.resolve()
    })
    expect(switches).toBe(2)
  })

  it("sends nothing before a socket exists", async () => {
    render(<Harness field={FieldName.PrescriberNpi} />)
    expect(framesOfType("UpdateConfiguration")).toHaveLength(0)
  })
})

describe("ForceEndpoint is sent by the product, not merely callable", () => {
  it("puts a ForceEndpoint frame on the live socket when the control is activated", async () => {
    render(<Harness field={FieldName.PrescriberNpi} />)
    await openTheLine()
    await userEvent.click(screen.getByRole("button", { name: /finished this answer/i }))
    expect(
      framesOfType("ForceEndpoint"),
      "the control has to close the turn, not merely look pressable",
    ).toHaveLength(1)
  })

  it("is reachable by keyboard alone, which is how the control is actually used mid-dictation", async () => {
    render(<Harness field={FieldName.Sig} />)
    await openTheLine()
    const control = screen.getByRole("button", { name: /finished this answer/i })
    control.focus()
    expect(document.activeElement).toBe(control)
    await userEvent.keyboard("{Enter}")
    expect(framesOfType("ForceEndpoint")).toHaveLength(1)
  })

  it("sends nothing when no socket is open", async () => {
    render(<Harness field={FieldName.Sig} />)
    await act(async () => {
      finish?.()
    })
    expect(framesOfType("ForceEndpoint")).toHaveLength(0)
  })
})
