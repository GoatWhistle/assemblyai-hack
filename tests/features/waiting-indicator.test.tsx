import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { SessionPhase } from "@/features/intake/session-status"
import { ReadBackState } from "@/features/read-back/read-back-machine"
import { WaitingIndicator } from "@/features/waiting/waiting-indicator"
import {
  isHumanTurn,
  isSystemThinking,
  WAITING_COPY,
  WaitingOn,
  type WaitingSignals,
  waitingOn,
} from "@/features/waiting/waiting-state"

function signals(overrides: Partial<WaitingSignals> = {}): WaitingSignals {
  return {
    phase: SessionPhase.Live,
    agentSpeaking: false,
    turnInFlight: false,
    readBackState: ReadBackState.Idle,
    ...overrides,
  }
}

describe("who is waiting for whom is derived from observable signals", () => {
  it("says nobody is waiting when the line is not open", () => {
    expect(
      waitingOn(signals({ phase: SessionPhase.Idle })),
      "claiming a turn with no socket open would be a state we cannot observe",
    ).toBe(WaitingOn.Nobody)
    expect(waitingOn(signals({ phase: SessionPhase.Closed }))).toBe(WaitingOn.Nobody)
  })

  it("separates the human thinking from the system thinking", () => {
    expect(
      isHumanTurn(waitingOn(signals())),
      "an open idle socket is the caller's turn and must not read as processing",
    ).toBe(true)
    expect(
      isSystemThinking(waitingOn(signals({ turnInFlight: true }))),
      "a request in flight to the gate is the system's turn",
    ).toBe(true)
  })

  it("names a read-back as the caller's turn, not as processing", () => {
    const state = waitingOn(signals({ readBackState: ReadBackState.AwaitingConfirmation }))
    expect(
      state,
      "during a read-back the caller must know the agent is waiting, not still working",
    ).toBe(WaitingOn.YourConfirmation)
    expect(isHumanTurn(state)).toBe(true)
  })

  it("treats a spell-out as the caller's turn for the same reason", () => {
    expect(waitingOn(signals({ readBackState: ReadBackState.SpellOut }))).toBe(
      WaitingOn.YourConfirmation,
    )
  })

  it("puts a reply in flight ahead of everything, because the mic is held closed", () => {
    expect(
      waitingOn(
        signals({
          agentSpeaking: true,
          turnInFlight: true,
          readBackState: ReadBackState.AwaitingConfirmation,
        }),
      ),
      "while the agent speaks nothing reaches the recognizer, so no other state can be true",
    ).toBe(WaitingOn.TheAgentSpeaking)
  })

  it("puts the gate ahead of a pending read-back, since the answer is still being checked", () => {
    expect(
      waitingOn({
        phase: SessionPhase.Live,
        agentSpeaking: false,
        turnInFlight: true,
        readBackState: ReadBackState.AwaitingConfirmation,
      }),
      "showing the caller's turn while their words are in flight invites a repeat utterance",
    ).toBe(WaitingOn.TheGate)
  })

  it("reports opening and closing as the system's own work", () => {
    expect(waitingOn(signals({ phase: SessionPhase.MintingTokens }))).toBe(WaitingOn.Opening)
    expect(waitingOn(signals({ phase: SessionPhase.RequestingMicrophone }))).toBe(
      WaitingOn.Opening,
    )
    expect(waitingOn(signals({ phase: SessionPhase.Closing }))).toBe(WaitingOn.Closing)
  })

  it("gives every state a side and the signal it was read from", () => {
    for (const state of Object.values(WaitingOn)) {
      const copy = WAITING_COPY[state]
      expect(
        copy.observedFrom.length,
        `${state} would claim a state with no named source, which is the dishonest version of this widget`,
      ).toBeGreaterThan(0)
      expect(["human", "system", "neither"]).toContain(copy.side)
    }
  })

  it("never calls an idle open line thinking", () => {
    expect(
      isSystemThinking(waitingOn(signals())),
      "a spinner over an idle socket is a lie the caller cannot check",
    ).toBe(false)
  })
})

describe("the indicator renders the side and the reason on screen", () => {
  it("labels the caller's turn as the caller's turn", () => {
    render(
      <WaitingIndicator
        signals={signals({ readBackState: ReadBackState.AwaitingConfirmation })}
      />,
    )
    expect(screen.getByText("your turn")).toBeDefined()
    expect(
      screen.getByText(WAITING_COPY[WaitingOn.YourConfirmation].headline),
      "a caller who cannot tell waiting from processing repeats themselves",
    ).toBeDefined()
  })

  it("warns against repeating while the gate is checking", () => {
    render(<WaitingIndicator signals={signals({ turnInFlight: true })} />)
    expect(screen.getByText("the system's turn")).toBeDefined()
    expect(
      screen.getByText(/Do not repeat yourself/),
      "a repeat during processing produces a second turn and both then carry provenance",
    ).toBeDefined()
  })

  it("exposes the state as a data attribute so the live screen can be asserted on", () => {
    const { container } = render(<WaitingIndicator signals={signals()} />)
    expect(container.querySelector('[data-waiting-on="you"]')).not.toBeNull()
  })

  it("names the signal it read the state from, rather than asserting it", () => {
    render(<WaitingIndicator signals={signals({ agentSpeaking: true })} />)
    expect(
      screen.getByText(/Read from the reply lifecycle on the agent socket/),
      "a state with no named source cannot be checked by a judge",
    ).toBeDefined()
  })

  it("does not repeat the microphone console's own wording", () => {
    render(<WaitingIndicator signals={signals({ agentSpeaking: true })} />)
    expect(
      screen.queryByText(/held closed on purpose/i),
      "two elements saying the same sentence adds noise to the screen without adding a signal",
    ).toBeNull()
  })

  it("announces changes politely rather than interrupting a screen reader mid-turn", () => {
    const { container } = render(<WaitingIndicator signals={signals()} />)
    expect(container.querySelector('output[aria-live="polite"]')).not.toBeNull()
  })
})
