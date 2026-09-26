import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  createLineScheduler,
  type InjectorLog,
  injectorScript,
  type LineStep,
} from "./caller-injector"
import { namedAnswer, responderFor } from "./responder"

const AGENT = "wss://agents.us.assemblyai.com/v1/ws?token=single-use"

const STEPS: readonly LineStep[] = [
  { line: "a", trigger: "reply-done", delayMs: 800 },
  { line: "b", trigger: "reply-done", whenAgentSaid: "correct", delayMs: 600 },
]

class FakeSocket extends EventTarget {
  constructor(readonly url: string) {
    super()
  }
  push(frame: Record<string, unknown>): void {
    this.dispatchEvent(new MessageEvent("message", { data: JSON.stringify(frame) }))
  }
}

class FakeAudioContext {
  resume = async () => undefined
  createMediaStreamDestination() {
    return { stream: { id: "injected-caller-track" } }
  }
  async decodeAudioData(bytes: ArrayBuffer) {
    return { duration: bytes.byteLength / 32000 }
  }
  createBufferSource() {
    return { buffer: null as unknown, connect: () => undefined, start: () => undefined }
  }
}

let page: Record<string, unknown> = {}
const media: Record<string, unknown> = {}

function injectorLog(): InjectorLog {
  return page.readbackCallerInjector as InjectorLog
}

function openSocket(url: string): FakeSocket {
  const Socket = page.WebSocket as typeof FakeSocket
  return new Socket(url)
}

async function flush(ms: number): Promise<void> {
  await vi.advanceTimersByTimeAsync(ms)
}

describe("the responder answers what the agent asked, not a fixed script", () => {
  const ask = (scheduler: ReturnType<typeof createLineScheduler>, text: string) => {
    scheduler.next({ type: "reply.started" })
    if (text.length > 0) {
      scheduler.next({ type: "transcript.agent", text })
    }
    return scheduler.next({ type: "reply.done" })?.line ?? null
  }

  it("gives the field asked for, a yes to a read-back, and nothing to a silent tool reply", () => {
    const scheduler = createLineScheduler([], responderFor("clean"))
    expect(ask(scheduler, "Got it. What is the quantity?")).toBe("quantity-clean")
    expect(ask(scheduler, "Could you please repeat the prescriber NPI?")).toBe("npi")
    expect(ask(scheduler, "Confirming the quantity: 30. Correct?")).toBe("yes")
    expect(ask(scheduler, "I didn't catch the drug name. Could you repeat it?")).toBe(
      "drug-clean",
    )
    scheduler.callerSpoke()
    expect(ask(scheduler, "")).toBeNull()
  })

  it("hears a question about the instructions as the sig, not the drug", () => {
    const scheduler = createLineScheduler([], responderFor("clean"))
    expect(ask(scheduler, "What are the instructions for the medication?")).toBe("sig-clean")
  })

  it("answers a question again when a silent reply cancelled the first answer", () => {
    const scheduler = createLineScheduler([], responderFor("clean"))
    expect(ask(scheduler, "Could you please repeat the sig?")).toBe("sig-clean")
    expect(ask(scheduler, ""), "the tool-only reply that cancelled it").toBe("sig-clean")
    scheduler.callerSpoke()
    expect(ask(scheduler, "")).toBeNull()
  })

  it("names the drug on the contrastive question even though it reads like a read-back", () => {
    const scheduler = createLineScheduler(
      [],
      responderFor("lasa", [namedAnswer("name-hydromorphone")]),
    )
    expect(
      ask(scheduler, "Which: hydromorphone, H Y D, or morphine, M O R? Is that right?"),
    ).toBe("name-hydromorphone")
  })

  it("lets a scripted step take precedence and stops after its line budget", () => {
    const scheduler = createLineScheduler(STEPS.slice(1, 2), {
      ...responderFor("clean"),
      maxLines: 1,
    })
    expect(ask(scheduler, "What is the route?")).toBe("route-clean")
    expect(ask(scheduler, "Lisinopril. Correct?")).toBe("b")
    expect(ask(scheduler, "What is the route?")).toBeNull()
  })
})

describe("the responder inside the page", () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("drops a pending answer when the agent starts another reply first", async () => {
    const script = injectorScript({
      agentHost: "agents.us.assemblyai.com",
      steps: [],
      responder: responderFor("clean"),
      lines: { yes: btoa("x".repeat(32000)) },
    })
    page = { WebSocket: FakeSocket }
    new Function("window", "navigator", "AudioContext", script)(
      page,
      { mediaDevices: media },
      FakeAudioContext,
    )
    const socket = openSocket(AGENT)
    socket.push({ type: "reply.started" })
    socket.push({ type: "transcript.agent", text: "Got it, the prescriber NPI is 1234567893." })
    socket.push({ type: "reply.done" })
    await flush(1000)
    socket.push({ type: "reply.started" })
    await flush(1000)
    expect(injectorLog().played).toEqual([])
    socket.push({
      type: "transcript.agent",
      text: "Confirming the drug name: lisinopril. Correct?",
    })
    socket.push({ type: "reply.done" })
    await flush(1500)
    expect(injectorLog().played.map((entry) => entry.line)).toEqual(["yes"])
  })
})
