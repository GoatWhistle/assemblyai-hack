import { act, renderHook } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { GateAction, policyFor, ReasonCode, SpellOutStyle } from "@/domain"
import {
  decisionFor,
  LASA_CANDIDATE,
  NAME_CANDIDATE,
  NAME_DECISION,
  QUANTITY_CANDIDATE,
} from "@/features/judge-demo/scenario"
import { ReadBackState } from "@/features/read-back/read-back-machine"
import { asksForVoice, useReadBack } from "@/features/read-back/use-read-back"

const LASA_DECISION = decisionFor(LASA_CANDIDATE)

describe("the read-back machine has a caller in the product", () => {
  it("leaves the machine idle until the gate asks for something aloud", () => {
    const { result } = renderHook(() => useReadBack())
    expect(result.current.context.state).toBe(ReadBackState.Idle)
    act(() => {
      result.current.observe([QUANTITY_CANDIDATE], [])
    })
    expect(result.current.context.state).toBe(ReadBackState.Idle)
  })

  it("enters the read-back when a decision asks, carrying the gate's own phrasing", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    expect(result.current.context.state).toBe(ReadBackState.AwaitingConfirmation)
    expect(
      result.current.context.utterance,
      "the panel must show what the gate said, not a phrase composed in the interface",
    ).toBe(LASA_DECISION.agentUtterance)
    expect(result.current.context.field).toBe(LASA_CANDIDATE.field)
    expect(result.current.askedCandidateId).toBe(LASA_CANDIDATE.candidateId)
  })

  it("resolves to matched when the caller says yes", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    act(() => {
      result.current.hear("yes")
    })
    expect(result.current.context.state).toBe(ReadBackState.Matched)
    expect(result.current.context.heard).toBe("yes")
  })

  it("resolves to failed when the caller says no", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    act(() => {
      result.current.hear("no, I said lisinopril")
    })
    expect(result.current.context.state).toBe(ReadBackState.Failed)
  })

  it("does not accept a restatement of the value as a confirmation, agreeing with the server", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    act(() => {
      result.current.hear(`it is ${String(LASA_CANDIDATE.normalizedValue)}`)
    })
    expect(
      result.current.context.state,
      "the server's read-back tool never treats a bare restatement as a yes; the browser echoing Matched here would contradict the record the server is about to write",
    ).toBe(ReadBackState.Failed)
  })

  it("ignores a turn heard while nothing was asked", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.hear("yes")
    })
    expect(
      result.current.context.state,
      "a stray yes must not confirm a field nobody asked about",
    ).toBe(ReadBackState.Idle)
  })

  it("asks once per candidate rather than restarting on every turn", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    const first = result.current.context.attempts
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    expect(result.current.context.attempts).toBe(first)
  })

  it("clears on reset so a second session does not inherit the first one's exchange", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([LASA_CANDIDATE], [LASA_DECISION])
    })
    act(() => {
      result.current.reset()
    })
    expect(result.current.context.state).toBe(ReadBackState.Idle)
    expect(result.current.askedCandidateId).toBeNull()
  })
})

describe("spell-out is reached through the policy, not through a literal", () => {
  it("enters spell-out with the field's own alphabet when the gate asks for it", () => {
    const { result } = renderHook(() => useReadBack())
    const spelling = { ...LASA_DECISION, action: GateAction.AskSpellOut }
    act(() => {
      result.current.observe([LASA_CANDIDATE], [spelling])
    })
    expect(result.current.context.state).toBe(ReadBackState.SpellOut)
    expect(result.current.context.spellOutStyle).toBe(
      policyFor(LASA_CANDIDATE.field).spellOutStyle,
    )
    expect(result.current.context.spellOutStyle).toBe(SpellOutStyle.Nato)
  })

  it("keeps a plain read-back free of a spelling alphabet", () => {
    const { result } = renderHook(() => useReadBack())
    act(() => {
      result.current.observe([NAME_CANDIDATE], [NAME_DECISION])
    })
    expect(result.current.context.spellOutStyle).toBe(SpellOutStyle.None)
  })
})

describe("which gate actions spend voice", () => {
  it("treats every asking action as one that needs a spoken answer", () => {
    for (const action of [
      GateAction.AskConfirm,
      GateAction.AskDisambiguate,
      GateAction.AskWhichPart,
      GateAction.AskSpellOut,
    ]) {
      expect(asksForVoice({ ...LASA_DECISION, action })).toBe(true)
    }
  })

  it("does not open a read-back for an accepted value or a terminal outcome", () => {
    for (const action of [GateAction.Accept, GateAction.EscalateHuman, GateAction.AbortField]) {
      expect(
        asksForVoice({ ...LASA_DECISION, action }),
        "opening a read-back on an accepted field would ask the caller to confirm what a validator already proved",
      ).toBe(false)
    }
  })

  it("opens the read-back for the LASA re-ask, which is the product's own claim", () => {
    expect(LASA_DECISION.reasonCode).toBe(ReasonCode.LasaHit)
    expect(asksForVoice(LASA_DECISION)).toBe(true)
  })
})
