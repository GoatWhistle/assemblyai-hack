import { readFileSync } from "node:fs"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { FieldName } from "@/domain"
import { MicConsole } from "@/features/microphone/mic-console"
import { MicState } from "@/features/microphone/mic-state"
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
const { useReadBack } = await import("@/features/read-back/use-read-back")
const { makeCandidate, makeProvenance, makeVerdict, makeWordSpan, policyFor, VerdictOutcome } =
  await import("@/domain")
const { decide } = await import("@/gate")

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

const CANDIDATE = makeCandidate({
  candidateId: "cand-1",
  field: FieldName.PatientName,
  rawValue: "Jane Doe",
  normalizedValue: "Jane Doe",
  provenance: makeProvenance({
    words: [makeWordSpan({ text: "Jane", startMs: 10, endMs: 400, confidence: 0.95 })],
    turnOrder: 0,
    transcriptSlice: "Jane Doe",
    sessionId: "fast-path-test",
    sttTurnIsFormatted: true,
  }),
  verdict: makeVerdict({
    outcome: VerdictOutcome.NotApplicable,
    validatorName: "none",
    detail: "no validator exists for a patient name",
    checkedValue: "Jane Doe",
  }),
  attempt: 1,
  createdAt: "2026-09-17T09:00:00.000Z",
})

const DECISION = decide(CANDIDATE, policyFor(FieldName.PatientName))

let heard: ((text: string) => void) | null = null

function Harness() {
  const readBack = useReadBack()
  const session = useSession({ transport: factory })
  heard = (text: string) => {
    const fast = readBack.hear(text)
    if (fast.endpointNow) {
      session.finishAnswer()
    }
  }
  return (
    <div>
      <button type="button" onClick={() => void session.start()}>
        open the line
      </button>
      <button type="button" onClick={() => readBack.observe([CANDIDATE], [DECISION])}>
        ask for a confirmation
      </button>
      <MicConsole
        state={MicState.Listening}
        level={0}
        elapsedMs={0}
        echoDiscards={0}
        patience={session.patience}
      />
      <p>fast path: {readBack.fastPath.action}</p>
    </div>
  )
}

beforeEach(() => {
  sockets = []
  heard = null
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

describe("the fast path is invoked from the product path, not merely callable", () => {
  async function openAndAsk() {
    await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
    await act(async () => {
      await Promise.resolve()
    })
    await userEvent.click(screen.getByRole("button", { name: /ask for a confirmation/i }))
  }

  it("puts a ForceEndpoint on the live socket the moment a yes is heard", async () => {
    render(<Harness />)
    await openAndAsk()
    await act(async () => {
      heard?.("Yes, that's right")
    })
    expect(
      framesOfType("ForceEndpoint"),
      "the answer to a read-back is one word; waiting out the endpoint silence spends the latency budget the fast path exists to save",
    ).toHaveLength(1)
    expect(screen.getByText(/fast path: affirm/i)).toBeTruthy()
  })

  it("sends no ForceEndpoint for an unclear answer, because the agent still has to handle it", async () => {
    render(<Harness />)
    await openAndAsk()
    await act(async () => {
      heard?.("uh-huh")
    })
    expect(
      framesOfType("ForceEndpoint"),
      "a noise the recognizer guessed at must reach the agent unchanged rather than closing the turn early",
    ).toHaveLength(0)
    expect(screen.getByText(/fast path: none/i)).toBeTruthy()
  })

  it("sends no ForceEndpoint for a yes spoken while nothing was asked", async () => {
    render(<Harness />)
    await userEvent.click(screen.getByRole("button", { name: /open the line/i }))
    await act(async () => {
      await Promise.resolve()
    })
    await act(async () => {
      heard?.("yes")
    })
    expect(
      framesOfType("ForceEndpoint"),
      "an ordinary yes mid-dictation is not an answer to a confirmation nobody asked for",
    ).toHaveLength(0)
  })
})

describe("the fast path is reached from the product tree, not only from this test", () => {
  it("acts on the fast path from the intake client rather than merely displaying it", () => {
    const client = readFileSync("app/(pages)/intake-client.tsx", "utf8")
    expect(client).toContain("readBack.hear")
    expect(
      /endpointNow/.test(client),
      "reading the fast path and not closing the turn on it is the same latency as having no fast path at all",
    ).toBe(true)
  })

  it("is consulted by a screen, not only by the hook that owns it", () => {
    const panel = readFileSync("src/features/read-back/read-back-panel/index.tsx", "utf8")
    expect(
      panel,
      "a local verdict the caller never sees is a latency win nobody can observe or dispute",
    ).toContain("FastPathAction")
  })

  it("keeps one vocabulary module rather than a third copy of the words", () => {
    const machine = readFileSync("src/features/read-back/read-back-machine.ts", "utf8")
    expect(
      machine,
      "a second literal list of confirming words inside the machine is the drift the shared module exists to prevent",
    ).toContain('from "./answer-vocabulary"')
    expect(/const CONFIRMING = \[/.test(machine)).toBe(false)
  })
})
