import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { wordSpanFromTurnWord } from "@/domain"
import { isSttTurn, type SessionFixture, type SttMessage } from "@/realtime/protocol"

const NAMES = [
  "happy-path",
  "lasa-catch",
  "checksum-fail",
  "low-confidence",
  "combo-invalid",
  "spell-out",
  "echo-phantom",
  "socket-3007",
] as const

function load(name: string): SessionFixture {
  return JSON.parse(
    readFileSync(resolve(`eval/fixtures/${name}.json`), "utf8"),
  ) as SessionFixture
}

describe("session fixtures", () => {
  it("all eight scenarios exist", () => {
    for (const name of NAMES) {
      expect(load(name).name, name).toBe(name)
    }
  })

  it("every fixture carries a session id, a description and frames", () => {
    for (const name of NAMES) {
      const item = load(name)
      expect(item.sessionId.length, name).toBeGreaterThan(0)
      expect(item.description.length, name).toBeGreaterThan(20)
      expect(item.frames.length, name).toBeGreaterThan(0)
      expect(Number.isNaN(Date.parse(item.recordedAt)), name).toBe(false)
    }
  })

  it("frames are ordered in time and name a real socket and direction", () => {
    for (const name of NAMES) {
      const frames = load(name).frames
      let previous = -1
      for (const frame of frames) {
        expect(frame.atMs, name).toBeGreaterThanOrEqual(previous)
        previous = frame.atMs
        expect(["stt", "agent"], name).toContain(frame.socket)
        expect(["in", "out"], name).toContain(frame.direction)
      }
    }
  })

  it("every stt turn converts to word spans the domain accepts", () => {
    for (const name of NAMES) {
      for (const frame of load(name).frames) {
        if (frame.socket !== "stt") {
          continue
        }
        const message = frame.message as SttMessage
        if (!isSttTurn(message)) {
          continue
        }
        expect(message.words.length, name).toBeGreaterThan(0)
        for (const word of message.words) {
          const span = wordSpanFromTurnWord(word)
          expect(span.endMs, `${name} ${word.text}`).toBeGreaterThanOrEqual(span.startMs)
          expect(span.confidence).toBeGreaterThanOrEqual(0)
          expect(span.confidence).toBeLessThanOrEqual(1)
        }
        expect(message.transcript).toBe(message.words.map((w) => w.text).join(" "))
      }
    }
  })

  it("the lasa fixture carries a perfect confidence on the confusable name", () => {
    const frames = load("lasa-catch").frames
    const turn = frames
      .map((f) => f.message)
      .filter((m): m is Extract<SttMessage, { type: "Turn" }> => m.type === "Turn")
      .find((m) => m.transcript.toLowerCase().includes("bisoprolol"))

    expect(turn).toBeDefined()
    const word = turn?.words.find((w) => w.text.toLowerCase() === "bisoprolol")
    expect(word?.confidence).toBe(1.0)
  })

  it("the low confidence fixture dips below the quantity threshold on one word", () => {
    const turn = load("low-confidence")
      .frames.map((f) => f.message)
      .filter((m): m is Extract<SttMessage, { type: "Turn" }> => m.type === "Turn")[0]

    const min = Math.min(...(turn?.words ?? []).map((w) => w.confidence))
    expect(min).toBeLessThan(0.92)
  })

  it("the echo fixture repeats the agent line so the client can discard it", () => {
    const frames = load("echo-phantom").frames
    const agentLine = frames.map((f) => f.message).find((m) => m.type === "transcript.agent")

    const phantom = frames
      .map((f) => f.message)
      .filter((m): m is Extract<SttMessage, { type: "Turn" }> => m.type === "Turn")
      .find((m) => m.transcript.toLowerCase().includes("did you say"))

    expect(agentLine).toBeDefined()
    expect(phantom, "without a phantom turn the client has nothing to discard").toBeDefined()
  })

  it("the socket fixture carries the close code in an error frame", () => {
    const error = load("socket-3007")
      .frames.map((f) => f.message)
      .find((m) => m.type === "error")

    expect(error).toBeDefined()
    expect(JSON.stringify(error)).toContain("3007")
  })

  it("every fixture ends by confirming the session ended", () => {
    for (const name of NAMES) {
      const types = load(name).frames.map((f) => f.message.type)
      expect(types, name).toContain("session.ended")
    }
  })
})
