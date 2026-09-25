import { POST as postTurn } from "@app/api/sessions/[id]/turns/route"
import { beforeEach, describe, expect, it } from "vitest"
import { type AgentTurn, makeWordSpan } from "@/domain"
import { createAgentTurnAssembler } from "@/features/intake/agent-turns"
import { callerBody, recognizerReport } from "@/features/intake/use-live-order"
import { registerSession, resetToolEnvironment } from "../../api/harness"

const SESSION = "turn-wire-session"

function post(body: unknown): Promise<Response> {
  return postTurn(
    new Request(`https://readback.example.com/api/sessions/${SESSION}/turns`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: SESSION }) },
  )
}

async function assembledAgentTurn(): Promise<AgentTurn> {
  const emitted: AgentTurn[] = []
  const assembler = createAgentTurnAssembler((turn) => emitted.push(turn))
  assembler.started("reply-1")
  assembler.transcript("Which: hydromorphone or morphine?", "reply-1", false)
  assembler.done("completed", "reply-1", Promise.resolve({ playedMs: 1800, durationMs: 1800 }))
  await Promise.resolve()
  await Promise.resolve()
  const [turn] = emitted
  if (turn === undefined) {
    throw new Error("the assembler emitted no agent turn")
  }
  return turn
}

describe("the route accepts exactly the bodies the browser builds", () => {
  beforeEach(async () => {
    await resetToolEnvironment()
    await registerSession(SESSION)
  })

  it("accepts the caller body use-live-order posts", async () => {
    const body = callerBody({
      turnOrder: 1,
      transcript: "hydromorphone two milligrams",
      isFormatted: true,
      words: ["hydromorphone", "two", "milligrams"].map((text, index) =>
        makeWordSpan({
          text,
          startMs: 1000 + index * 300,
          endMs: 1250 + index * 300,
          confidence: 0.97,
        }),
      ),
    })
    const response = await post(body)
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200)
    expect((await response.json()).wordsInTurn).toBe(3)
  })

  it("accepts the agent turn the reply assembler emits", async () => {
    const response = await post(await assembledAgentTurn())
    expect(response.status, JSON.stringify(await response.clone().json())).toBe(200)
    expect((await response.json()).role).toBe("agent")
  })

  it("accepts the recognizer report use-live-order posts, with and without a model", async () => {
    for (const model of ["universal-3-5-pro", null]) {
      const response = await post(recognizerReport(model))
      expect(response.status, JSON.stringify(await response.clone().json())).toBe(200)
      expect((await response.json()).role).toBe("recognizer")
    }
  })
})
