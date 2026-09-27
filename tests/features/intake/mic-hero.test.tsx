import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { MicDial } from "@/features/microphone/mic-dial"
import { MicState } from "@/features/microphone/mic-state"

function dialOf(state: MicState): HTMLElement {
  render(
    <MicDial state={state}>
      <button type="button">Start listening</button>
    </MicDial>,
  )
  const dial = screen.getByRole("button", { name: "Start listening" }).parentElement
  if (dial === null) {
    throw new Error("the trigger sits outside its dial")
  }
  return dial
}

describe("the microphone dial on the call page", () => {
  it("keeps the trigger as the only control, the rings being decoration a screen reader skips", () => {
    const dial = dialOf(MicState.Idle)
    expect(dial.querySelectorAll("button")).toHaveLength(1)
    for (const ring of dial.querySelectorAll("span")) {
      expect(ring.getAttribute("aria-hidden")).toBe("true")
    }
  })

  it("invites a press only while the line is ready, never while it is open or blocked", () => {
    expect(dialOf(MicState.Idle).className).toMatch(/ready/)
    for (const state of [MicState.Listening, MicState.Blocked, MicState.Opening]) {
      document.body.innerHTML = ""
      expect(dialOf(state).className, state).not.toMatch(/ready/)
    }
  })
})
