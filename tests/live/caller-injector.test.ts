import { existsSync, readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { lasaRiskFor } from "@/lasa"
import {
  createLineScheduler,
  type InjectorLog,
  injectorScript,
  type LineStep,
} from "./caller-injector"
import { CALLER_LINES, type CallerLineId, lineFile } from "./lines"
import { judgeRun, SCENARIOS } from "./scenarios"

const AGENT = "wss://agents.assemblyai.com/v1/ws?token=single-use"

class FakeSocket extends EventTarget {
  constructor(readonly url: string) {
    super()
  }
  push(frame: Record<string, unknown>): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) }))
  }
}

const started: string[] = []

class FakeAudioContext {
  resume = async () => undefined
  createMediaStreamDestination() {
    return { stream: { id: "injected-caller-track" } }
  }
  async decodeAudioData(bytes: ArrayBuffer) {
    return { duration: bytes.byteLength / 32000 }
  }
  createBufferSource() {
    const source = {
      buffer: null as unknown,
      connect: () => undefined,
      start: () => started.push(String((source.buffer as { duration: number }).duration)),
    }
    return source
  }
}

let page: Record<string, unknown> = {}
let media: { getUserMedia?: (constraints: unknown) => Promise<{ id: string }> } = {}

function injectorLog(): InjectorLog {
  const log = page.readbackCallerInjector as InjectorLog | undefined
  if (log === undefined) {
    throw new Error("the injector did not install its log")
  }
  return log
}

function openSocket(url: string): FakeSocket {
  const Socket = page.WebSocket as typeof FakeSocket
  return new Socket(url)
}

async function flush(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}

const STEPS: readonly LineStep[] = [
  { line: "a", trigger: "reply-done", delayMs: 800 },
  { line: "b", trigger: "reply-done", whenAgentSaid: "correct", delayMs: 600 },
  { line: "c", trigger: "reply-started", delayMs: 1500 },
]

describe("S4: the scripted caller speaks only when the agent has finished the right reply", () => {
  it("plays the first line after the greeting and waits for a read-back before the second", () => {
    const scheduler = createLineScheduler(STEPS)
    expect(scheduler.next({ type: "reply.started" })).toBeNull()
    expect(scheduler.next({ type: "reply.done" })).toEqual({ line: "a", delayMs: 800, step: 0 })
    scheduler.next({ type: "reply.started" })
    scheduler.next({ type: "transcript.agent", text: "What is the patient's name?" })
    expect(
      scheduler.next({ type: "reply.done" }),
      "a question that is not a read-back",
    ).toBeNull()
    scheduler.next({ type: "reply.started" })
    scheduler.next({ type: "transcript.agent", text: "Lisinopril ten milligrams. Correct?" })
    expect(scheduler.next({ type: "reply.done" })?.line).toBe("b")
    expect(scheduler.done()).toBe(false)
  })

  it("barges in on reply.started, not on reply.done", () => {
    const scheduler = createLineScheduler(STEPS.slice(2))
    expect(scheduler.next({ type: "reply.done" })).toBeNull()
    expect(scheduler.next({ type: "reply.started" })).toEqual({
      line: "c",
      delayMs: 1500,
      step: 0,
    })
    expect(scheduler.done()).toBe(true)
  })
})

describe("S4: the injector script, evaluated as the browser receives it", () => {
  beforeEach(() => {
    started.length = 0
    vi.useFakeTimers()
    page = { WebSocket: FakeSocket }
    media = {}
    const lines = { a: btoa("x".repeat(32000)), b: btoa("y".repeat(64000)) }
    const script = injectorScript({ agentHost: "agents.assemblyai.com", steps: STEPS, lines })
    new Function("window", "navigator", "AudioContext", script)(
      page,
      { mediaDevices: media },
      FakeAudioContext,
    )
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("hands the page the injected track instead of a microphone", async () => {
    const stream = await media.getUserMedia?.({ audio: true })
    expect(stream?.id).toBe("injected-caller-track")
  })

  it("plays each due line into that track after the agent's reply.done", async () => {
    const socket = openSocket(AGENT)
    socket.push({ type: "reply.started" })
    socket.push({ type: "audio", audio: "AAAA" })
    socket.push({ type: "reply.done", status: "completed" })
    await flush(799)
    expect(injectorLog().played).toEqual([])
    await flush(1)
    expect(injectorLog().played.map((entry) => entry.line)).toEqual(["a"])
    expect(started).toEqual(["1"])
    expect(
      injectorLog().events.map((event) => event.type),
      "audio frames are not logged",
    ).toEqual(["reply.started", "reply.done"])
  })

  it("watches only the agent socket", async () => {
    const stt = openSocket("wss://streaming.assemblyai.com/v3/ws?token=t")
    stt.push({ type: "reply.done" })
    await flush(1000)
    expect(injectorLog().events).toEqual([])
  })

  it("records a missing line as an error rather than staying silent", async () => {
    const socket = openSocket(AGENT)
    socket.push({ type: "reply.done" })
    await flush(800)
    socket.push({ type: "reply.started" })
    socket.push({ type: "transcript.agent", text: "Correct?" })
    socket.push({ type: "reply.done" })
    await flush(600)
    socket.push({ type: "reply.started" })
    await flush(1500)
    expect(injectorLog().errors).toEqual(["no audio was supplied for line c"])
  })
})

describe("S4: the committed caller lines and scenarios", () => {
  it("has a 16 kHz mono PCM16 WAV for every line a scenario uses", () => {
    const used = new Set(SCENARIOS.flatMap((s) => s.steps.map((step) => step.line)))
    for (const id of Object.keys(CALLER_LINES) as CallerLineId[]) {
      expect(used.has(id), `${id} is generated but no scenario says it`).toBe(true)
    }
    for (const id of used) {
      expect(existsSync(lineFile(id)), lineFile(id)).toBe(true)
      const wav = readFileSync(lineFile(id))
      expect(wav.toString("ascii", 0, 4)).toBe("RIFF")
      expect(wav.toString("ascii", 8, 12)).toBe("WAVE")
      const fmt = wav.indexOf("fmt ")
      expect(wav.readUInt16LE(fmt + 8), `${id} is PCM`).toBe(1)
      expect(wav.readUInt16LE(fmt + 10), `${id} is mono`).toBe(1)
      expect(wav.readUInt32LE(fmt + 12), `${id} is 16 kHz`).toBe(16000)
      expect(wav.readUInt16LE(fmt + 22), `${id} is 16-bit`).toBe(16)
    }
  })

  it("orders a drug in no published pair in the plain scenarios and a pair member in the LASA one", () => {
    expect(CALLER_LINES["order-clean"]).toContain("Lisinopril")
    expect(CALLER_LINES["order-no-npi"]).toContain("Lisinopril")
    expect(lasaRiskFor("lisinopril").hit).toBe(false)
    expect(lasaRiskFor("hydromorphone").confusableWith).toContain("morphine")
  })

  it("covers the six scenarios the plan names", () => {
    expect(SCENARIOS.map((s) => s.id)).toEqual([
      "clean-order",
      "lasa-named",
      "yeah-no",
      "barge-in",
      "npi-groups",
      "commit-hold",
    ])
  })

  it("judges a run completed only when every expectation is observed", () => {
    const lasa = SCENARIOS[1]
    if (lasa === undefined) {
      throw new Error("missing scenario")
    }
    const log: InjectorLog = { played: [], events: [], errors: [], finished: true }
    expect(judgeRun(lasa, { orderText: "Drug name hydromorphone", log }).outcome).toBe("failed")
    expect(
      judgeRun(lasa, { orderText: "Committed. Drug name hydromorphone", log }).outcome,
    ).toBe("completed")
    expect(judgeRun(lasa, { orderText: "", log: null }).outcome).toBe("inconclusive")
  })

  it("judges a barge-in only by an interruption that follows the barge-in line", () => {
    const barge = SCENARIOS[3]
    if (barge === undefined) {
      throw new Error("missing scenario")
    }
    const played = [{ line: "barge-in", step: 1, atMs: 100, durationMs: 900 }]
    const before = { type: "reply.done", atMs: 50, status: "interrupted" }
    const after = { type: "reply.done", atMs: 400, status: "interrupted" }
    const judged = (events: InjectorLog["events"]) =>
      judgeRun(barge, { orderText: "", log: { played, events, errors: [], finished: true } })
    expect(judged([before]).outcome).toBe("failed")
    expect(judged([before, after]).outcome).toBe("completed")
  })
})
