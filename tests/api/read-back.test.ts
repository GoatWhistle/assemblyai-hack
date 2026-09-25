import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { classifyCallerReply } from "@/confirmation"
import { call, intake, readBackAloud, resetToolEnvironment, seedTurn } from "./harness"

const READ_BACK = "Confirming the quantity: 30. Correct?"

function classifyAnswer(text: string, valueText = "lisinopril 10 mg"): string {
  return classifyCallerReply({ text, valueText }).verdict
}

beforeEach(resetToolEnvironment)

async function proposeQuantity(): Promise<string> {
  await seedTurn("thirty", 0.99)
  const body = await (
    await proposeField(
      call("propose-field", {
        field: "quantity",
        value: "thirty",
        transcript_hint: "thirty",
      }),
    )
  ).json()
  return body.candidate_id
}

async function answer(candidateId: string, callerAnswer: string): Promise<Response> {
  if (callerAnswer.trim().length > 0) {
    await readBackAloud(READ_BACK, callerAnswer)
  }
  return readBack(
    call("read-back", {
      field: "quantity",
      candidate_id: candidateId,
      utterance: READ_BACK,
      caller_answer: callerAnswer,
    }),
  )
}

describe("read_back", () => {
  it("treats anything other than an explicit yes as not confirmed", async () => {
    const candidateId = await proposeQuantity()

    for (const reply of ["uh", "what?", "maybe", "", "could you repeat that"]) {
      const body = await (await answer(candidateId, reply)).json()
      expect(body.written_to_order, `${reply} was treated as a yes`).toBe(false)
    }
  })

  it("writes the value only on an explicit yes", async () => {
    const candidateId = await proposeQuantity()
    const body = await (await answer(candidateId, "yes")).json()

    expect(body.written_to_order).toBe(true)
    expect(body.confirmation_mode).toBe("read_back")
    expect((await intake()).order.fields.get("quantity")?.value).toBe(30)
  })

  it("accepts the documented affirmations and rejects the denials", async () => {
    for (const yes of ["yes", "yeah", "correct", "that's right", "confirmed", "right"]) {
      await resetToolEnvironment()
      const candidateId = await proposeQuantity()
      const body = await (await answer(candidateId, yes)).json()
      expect(body.written_to_order, yes).toBe(true)
    }

    for (const no of ["no", "nope", "wrong", "not quite", "negative"]) {
      await resetToolEnvironment()
      const candidateId = await proposeQuantity()
      const body = await (await answer(candidateId, no)).json()
      expect(body.written_to_order, no).toBe(false)
      expect(body.answer).toBe("rejected")
    }
  })

  it("registers the awaited answer before the agent speaks", async () => {
    const candidateId = await proposeQuantity()
    const body = await (
      await readBack(
        call("read-back", {
          field: "quantity",
          candidate_id: candidateId,
          utterance: "Confirming the quantity: 30. Correct?",
        }),
      )
    ).json()

    expect(body.registered).toBe(true)
    expect(body.awaiting).toBe("yes_no")
    expect(body.written_to_order).toBe(false)
  })

  it("cannot confirm a candidate the gate never saw", async () => {
    await proposeQuantity()
    const body = await (await answer("candidate-that-does-not-exist", "yes")).json()

    expect(body.written_to_order).toBe(false)
    expect(body.error).toContain("no gate decision")
  })

  it("stores the spelled out utterance literally, not the normalized value", async () => {
    const candidateId = await proposeQuantity()
    const spoken = "three zero"
    await readBackAloud(spoken, "yes")
    const body = await (
      await readBack(
        call("read-back", {
          field: "quantity",
          candidate_id: candidateId,
          utterance: spoken,
          style: "spell_out",
          caller_answer: "yes",
        }),
      )
    ).json()

    expect(body.read_back_utterance).toBe(spoken)
    expect(body.confirmation_mode).toBe("spell_out")
  })
})

describe("the dissolved-verb transcript: a recognizer preserves proper nouns and drops the verb", () => {
  it(
    "does not read a bare value-only reply as an affirmation, because the CLAUDE.md failure " +
      "direction to avoid is a confirmation vanishing while the value it confirmed survives",
    () => {
      expect(
        classifyAnswer("Lisinopril, ten milligrams"),
        "the caller may have said yes, lisinopril, ten milligrams and only the value survived recognition; treating the leftover value-only text as an affirmation would write the field on a confirmation nobody heard",
      ).toBe("unclear")
    },
  )

  it(
    "still recognizes an explicit yes when punctuation from formatted recognizer output " +
      "is glued directly onto it",
    () => {
      expect(
        classifyAnswer("yes, Lisinopril, ten milligrams"),
        "the verb is present here, just followed by a comma a formatted transcript would insert; refusing to see it would be the same failure by a different route, since the caller did say an explicit yes",
      ).toBe("confirmed")
    },
  )

  it("does not accept the value alone even when it repeats the exact field content", async () => {
    await seedTurn("thirty", 0.99)
    const proposal = await (
      await proposeField(
        call("propose-field", {
          field: "quantity",
          value: "thirty",
          transcript_hint: "thirty",
        }),
      )
    ).json()

    await readBackAloud(READ_BACK, "thirty")
    const body = await (
      await readBack(
        call("read-back", {
          field: "quantity",
          candidate_id: proposal.candidate_id,
          utterance: READ_BACK,
          caller_answer: "thirty",
        }),
      )
    ).json()

    expect(
      body.written_to_order,
      "the recognizer returning the number back is not the same as the caller confirming it; only an explicit yes counts",
    ).toBe(false)
    expect((await intake()).order.fields.has("quantity")).toBe(false)
  })

  it("rejects a denial even when punctuation is glued onto the word", () => {
    expect(classifyAnswer("no, that's wrong")).toBe("rejected")
  })
})

describe("a vocalised agreement is not a confirmation, however the recognizer spells it", () => {
  const VOCALISED = ["uh-huh", "Aha", "mhm", "mm-hmm", "uh huh", "hmm"]

  for (const heard of VOCALISED) {
    it(`treats ${heard} as unclear rather than as a yes`, () => {
      expect(
        classifyAnswer(heard),
        "a competitor measured a spoken uh-huh coming back as Aha, which burned two of three re-asks on one slot. The lexicon is not the question: a noise the recognizer guessed at must never stand as the confirmation that lets a value into a prescription, so the honest outcome is a re-ask",
      ).toBe("unclear")
    })
  }

  it("still accepts the words a caller would use if asked to say yes plainly", () => {
    for (const plain of ["yes", "yeah", "correct"]) {
      expect(
        classifyAnswer(plain),
        "refusing every short reply would make the read-back unpassable and the false-ask rate one; the distinction is between a word and a noise",
      ).toBe("confirmed")
    }
  })
})
