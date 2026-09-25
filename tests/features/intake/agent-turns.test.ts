import { describe, expect, it } from "vitest"
import type { AgentTurn } from "@/domain"
import { createAgentTurnAssembler, turnStatus } from "@/features/intake/agent-turns"

const measured = (playedMs: number, durationMs: number) =>
  Promise.resolve({ playedMs, durationMs })

async function flush() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("an agent turn pairs the transcript with the reply's end", () => {
  it("emits once both the transcript and reply.done have arrived", async () => {
    const out: AgentTurn[] = []
    const turns = createAgentTurnAssembler((turn) => out.push(turn))
    turns.started("r1")
    turns.transcript("Lisinopril ten milligrams, is that right?", "r1", false)
    expect(out).toEqual([])
    turns.done("completed", null, measured(2400, 2400))
    await flush()
    expect(out).toEqual([
      {
        role: "agent",
        replyId: "r1",
        text: "Lisinopril ten milligrams, is that right?",
        status: "completed",
        playedMs: 2400,
        durationMs: 2400,
      },
    ])
  })

  it("pairs a transcript that arrives after reply.done", async () => {
    const out: AgentTurn[] = []
    const turns = createAgentTurnAssembler((turn) => out.push(turn))
    turns.started(null)
    turns.done("completed", null, measured(900, 900))
    await flush()
    turns.transcript("Say the strength again.", null, false)
    expect(out).toHaveLength(1)
    expect(out[0]?.text).toBe("Say the strength again.")
  })

  it("never reports completed when the transcript says the reply was cut off", async () => {
    const out: AgentTurn[] = []
    const turns = createAgentTurnAssembler((turn) => out.push(turn))
    turns.started("r2")
    turns.transcript("Lisinopril ten", "r2", true)
    turns.done("completed", "r2", measured(800, 2000))
    await flush()
    expect(out[0]?.status).toBe("interrupted")
  })

  it("does not emit a reply that was reset before it settled", async () => {
    const out: AgentTurn[] = []
    const turns = createAgentTurnAssembler((turn) => out.push(turn))
    turns.started("r3")
    turns.transcript("text", "r3", false)
    turns.done("completed", "r3", measured(1, 1))
    turns.reset()
    await flush()
    expect(out).toEqual([])
  })
})

describe("an unreported status is not a completed one", () => {
  it("reads a missing reply.done status as interrupted", () => {
    expect(turnStatus(null, false)).toBe("interrupted")
    expect(turnStatus("interrupted", false)).toBe("interrupted")
    expect(turnStatus("completed", false)).toBe("completed")
  })
})
