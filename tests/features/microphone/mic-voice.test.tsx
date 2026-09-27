import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { MicDial, voiceOf } from "@/features/microphone/mic-dial"
import { MicState } from "@/features/microphone/mic-state"

function preferReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })),
  )
}

function dialFor(state: MicState, level: number): HTMLElement {
  render(
    <MicDial state={state} level={level}>
      <button type="button">Start listening</button>
    </MicDial>,
  )
  const dial = screen.getByRole("button", { name: "Start listening" }).parentElement
  if (dial === null) {
    throw new Error("the trigger sits outside its dial")
  }
  return dial
}

describe("the voice motif around the microphone", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("follows the real input level only while the caller's line is open", () => {
    expect(voiceOf(MicState.Listening, 0.5, false)).toBe(0.5)
    expect(voiceOf(MicState.Listening, 1.7, false)).toBe(1)
    for (const state of [MicState.Idle, MicState.AgentSpeaking, MicState.Opening]) {
      expect(voiceOf(state, 0.8, false), state).toBeNull()
    }
  })

  it("stills the halo when reduced motion is asked for, whatever the level", () => {
    expect(voiceOf(MicState.Listening, 0.8, true)).toBeNull()
    preferReducedMotion(true)
    const dial = dialFor(MicState.Listening, 0.8)
    expect(dial.style.getPropertyValue("--voice")).toBe("")
    expect(dial.dataset.voice).toBeUndefined()
  })

  it("drives the halo from the level while listening with full motion", () => {
    preferReducedMotion(false)
    const dial = dialFor(MicState.Listening, 0.625)
    expect(dial.style.getPropertyValue("--voice")).toBe("0.625")
    expect(dial.dataset.voice).toBe("live")
  })

  it("tells the agent speaking apart from the caller speaking", () => {
    preferReducedMotion(false)
    const caller = dialFor(MicState.Listening, 0.4).className
    document.body.innerHTML = ""
    const agent = dialFor(MicState.AgentSpeaking, 0).className
    expect(caller).toMatch(/open/)
    expect(agent).toMatch(/agent/)
    expect(agent).not.toMatch(/open/)
  })

  it("keeps every ring decorative, so the trigger stays the only thing a reader meets", () => {
    preferReducedMotion(false)
    const dial = dialFor(MicState.AgentSpeaking, 0)
    const rings = [...dial.querySelectorAll("span")]
    expect(rings.length).toBeGreaterThanOrEqual(5)
    for (const ring of rings) {
      expect(ring.getAttribute("aria-hidden")).toBe("true")
    }
  })

  it("gives the halo and the agent's rings a still alternative under reduced motion", () => {
    const sheet = readFileSync("src/features/microphone/mic-dial/styles.module.css", "utf8")
    const reduced = sheet.slice(sheet.indexOf("@media (prefers-reduced-motion: reduce)"))
    expect(reduced).toMatch(/\.agent \.emit,\s*\.agent \.emitLate\s*\{\s*animation: none;/)
    expect(reduced).toMatch(/\.open \.voice\s*\{[^}]*scale: 1\.12;/)
  })
})
