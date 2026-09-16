import { describe, expect, it } from "vitest"
import { ECHO_MATCH_THRESHOLD, EchoGuard, utteranceOverlap } from "@/audio/echo-guard"
import { MIC_CONSTRAINTS } from "@/audio/microphone"

const AGENT_LINE =
  "I heard Bisoprolol. That name is on the published confused-drug-names list together with Lisinopril."

describe("layer one: getUserMedia constraints", () => {
  it("requests all three browser echo defences", () => {
    const audio = MIC_CONSTRAINTS.audio as MediaTrackConstraints
    expect(audio.echoCancellation).toBe(true)
    expect(audio.noiseSuppression).toBe(true)
    expect(audio.autoGainControl).toBe(true)
  })
})

describe("layer three: half-duplex gate", () => {
  it("stops sending to stt between reply.started and reply.done", () => {
    const guard = new EchoGuard()
    expect(guard.shouldSendToStt()).toBe(true)
    guard.replyStarted()
    expect(guard.shouldSendToStt()).toBe(false)
    expect(guard.isAgentSpeaking).toBe(true)
    guard.replyDone()
    expect(guard.shouldSendToStt()).toBe(true)
  })
})

describe("layer four: phantom turn discard", () => {
  it("discards a turn arriving during playback that matches the agent's own last line", () => {
    const guard = new EchoGuard()
    guard.noteAgentTranscript(AGENT_LINE)
    guard.replyStarted()
    const verdict = guard.inspectTurn(
      "I heard Bisoprolol that name is on the published confused drug names list",
    )
    expect(verdict.discard).toBe(true)
    expect(verdict.duringPlayback).toBe(true)
    expect(verdict.overlap).toBeGreaterThanOrEqual(ECHO_MATCH_THRESHOLD)
    expect(guard.discardedCount).toBe(1)
  })

  it("keeps a real interruption that arrives during playback but says something else", () => {
    const guard = new EchoGuard()
    guard.noteAgentTranscript(AGENT_LINE)
    guard.replyStarted()
    const verdict = guard.inspectTurn("No, stop, I said thirty tablets not sixty")
    expect(verdict.discard).toBe(false)
    expect(guard.discardedCount).toBe(0)
  })

  it("keeps a caller who legitimately repeats the drug name when the agent is not speaking", () => {
    const guard = new EchoGuard()
    guard.noteAgentTranscript(AGENT_LINE)
    guard.replyDone()
    const verdict = guard.inspectTurn("Lisinopril, yes, Lisinopril")
    expect(verdict.discard).toBe(false)
    expect(verdict.duringPlayback).toBe(false)
  })

  it("keeps everything when no agent line has been seen yet", () => {
    const guard = new EchoGuard()
    guard.replyStarted()
    expect(guard.inspectTurn("Bisoprolol ten milligrams").discard).toBe(false)
  })

  it("counts every discard so the metric event can be emitted per occurrence", () => {
    const guard = new EchoGuard()
    guard.noteAgentTranscript("Confirming quantity thirty. Correct?")
    guard.replyStarted()
    guard.inspectTurn("Confirming quantity thirty correct")
    guard.inspectTurn("confirming quantity thirty")
    expect(guard.discardedCount).toBe(2)
  })

  it("clears its state on reset so one session cannot leak into the next", () => {
    const guard = new EchoGuard()
    guard.noteAgentTranscript(AGENT_LINE)
    guard.replyStarted()
    guard.inspectTurn(AGENT_LINE)
    guard.reset()
    expect(guard.discardedCount).toBe(0)
    expect(guard.isAgentSpeaking).toBe(false)
    expect(guard.agentLine).toBeNull()
  })
})

describe("utteranceOverlap", () => {
  it("is one for an exact repetition and zero for unrelated text", () => {
    expect(utteranceOverlap("thirty tablets", "thirty tablets please")).toBe(1)
    expect(utteranceOverlap("thirty tablets", "who is the patient")).toBe(0)
  })

  it("ignores punctuation and case, which differ between tts text and stt output", () => {
    expect(utteranceOverlap("Bisoprolol, ten mg.", "bisoprolol ten mg")).toBe(1)
  })

  it("is zero for empty input rather than dividing by zero", () => {
    expect(utteranceOverlap("", "anything")).toBe(0)
    expect(utteranceOverlap("anything", "")).toBe(0)
  })
})
