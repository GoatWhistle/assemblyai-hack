import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { beforeEach, describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

type Body = Record<string, unknown>

function evidenceOf(body: Body): Record<string, unknown> {
  return body.evidence as Record<string, unknown>
}

async function propose(field: FieldName, value: string, quotation: string): Promise<Body> {
  const response = await proposeField(
    call("propose-field", {
      session_id: SESSION,
      field,
      value,
      transcript_hint: quotation,
    }),
  )
  return (await response.json()) as Body
}

describe("a value is refused when its quotation is absent from the transcript the server holds", () => {
  it("refuses a value whose quotation appears in no recorded turn", async () => {
    seedTurn("lisinopril ten milligrams", 0.99, 1)
    const body = await propose(FieldName.DrugName, "metformin", "metformin five hundred")

    expect(
      body.reason_code,
      "the quotation is the only thing tying a value to speech the server itself holds; without it the agent is asserting a value and the server has no way to check the assertion",
    ).toBe("E_PROVENANCE_NOT_FOUND")
    expect(
      body.candidate_id,
      "a value with no quotation never becomes a candidate, so there is no id a later read_back could confirm it under",
    ).toBeNull()
    expect(
      intakeFor(SESSION).order.fields.size,
      "the invariant is about the write, not about the wording of the refusal: the order must stay empty",
    ).toBe(0)
  })

  it("cannot be written even by attempting read_back against the refused proposal", async () => {
    seedTurn("lisinopril ten milligrams", 0.99, 1)
    const refused = await propose(FieldName.DrugName, "metformin", "metformin five hundred")

    const response = await readBack(
      call("read-back", {
        session_id: SESSION,
        field: FieldName.DrugName,
        candidate_id: "forged-candidate-id",
        utterance: "Confirming drug name: metformin. Correct?",
        caller_answer: "yes",
      }),
    )
    const confirmation = (await response.json()) as Body

    expect(
      refused.candidate_id,
      "the refusal is what forces the agent to invent an id, which is the attack this test performs",
    ).toBeNull()
    expect(
      confirmation.written_to_order,
      "attempting the write is the proof: an unquotable value must not reach the order through the one route that does write, no matter what the caller answered",
    ).toBe(false)
    expect(
      intakeFor(SESSION).order.fields.size,
      "ConfirmedValue is constructible only inside the gate and the gate needs a candidate; with no candidate there is no code path to a written field",
    ).toBe(0)
  })

  it("names the quotation it could not find and the turns it searched", async () => {
    seedTurn("lisinopril ten milligrams", 0.99, 1)
    seedTurn("thirty tablets", 0.99, 2)
    const body = await propose(FieldName.DrugName, "metformin", "metformin five hundred")
    const evidence = evidenceOf(body)

    expect(
      evidence.quotation,
      "a bare no is not auditable; the refusal has to say which phrase was looked for so the failure can be reproduced from the record alone",
    ).toBe("metformin five hundred")
    expect(
      evidence.searched_turns,
      "the turns searched bound the claim: without them the refusal could mean the phrase was absent or that the server looked in the wrong place",
    ).toEqual([1, 2])
    expect(
      evidence.searched_turn_text,
      "turn numbers alone are indices; a judge reading the record needs the words the server actually held to see that the quotation really is not there",
    ).toContain("lisinopril ten milligrams")
    expect(
      String(evidence.searched_turn_text),
      "every searched turn contributes its text, not only the most recent one",
    ).toContain("thirty tablets")
    expect(
      body.say_to_caller,
      "the sentence spoken to the caller names the phrase too, so the human hears which words failed rather than a generic request to repeat",
    ).toContain("metformin five hundred")
  })

  it("records the verbatim span, not just indices, when the quotation does trace", async () => {
    seedTurn("lisinopril ten milligrams", 0.99, 1)
    const body = await propose(FieldName.DrugName, "lisinopril", "lisinopril")
    const evidence = evidenceOf(body)

    expect(
      evidence.quoted_span,
      "provenance is computed in the browser, so the one part of it the server can prove is that these exact words were in a turn it holds; recording the span makes that check visible in the record instead of implied",
    ).toBe("lisinopril")
    expect(
      evidence.quotation,
      "the quotation the agent supplied is recorded beside the span it matched, so a later reader can see the two agreed rather than trusting that they did",
    ).toBe("lisinopril")
    expect(
      evidence.source_turn,
      "a span without the turn it came from cannot be checked against the stored transcript",
    ).toBe(1)
    expect(
      evidence.span_ms,
      "the millisecond span stays alongside the words, because the words prove which speech and the timings prove where in it",
    ).toHaveLength(2)
  })

  it("carries the verbatim words onto the candidate the gate decided over", async () => {
    seedTurn("azithromycin two hundred fifty milligrams", 0.99, 1)
    await propose(FieldName.Strength, "250 mg", "two hundred fifty milligrams")

    const candidate = [...intakeFor(SESSION).candidates.values()].at(-1)

    expect(
      candidate?.provenance.transcriptSlice,
      "the record that outlives the request is the candidate, so the verbatim span has to be on it and not only in the response the agent reads once",
    ).toBe("two hundred fifty milligrams")
    expect(
      candidate?.provenance.spokenText,
      "the spoken words are kept as words, so a disagreement between value and speech can be re-derived later without the audio",
    ).toBe("two hundred fifty milligrams")
  })

  it("refuses a quotation whose words exist but not contiguously in that order", async () => {
    seedTurn("lisinopril ten milligrams by mouth", 0.99, 1)
    const body = await propose(FieldName.DrugName, "lisinopril", "milligrams lisinopril")

    expect(
      body.reason_code,
      "a quotation is a contiguous stretch of speech; letting a reordered bag of words match would mean the server accepts a phrase nobody uttered and the invariant becomes a word-presence check",
    ).toBe("E_PROVENANCE_NOT_FOUND")
    expect(
      intakeFor(SESSION).order.fields.size,
      "a reordered quotation must not open a path to a written field",
    ).toBe(0)
  })

  it("searches only the recent window, so an old turn cannot supply a quotation forever", async () => {
    seedTurn("lisinopril ten milligrams", 0.99, 1)
    seedTurn("thirty tablets", 0.99, 2)
    seedTurn("by mouth", 0.99, 3)
    seedTurn("twice daily", 0.99, 4)
    const body = await propose(FieldName.DrugName, "lisinopril", "lisinopril")

    expect(
      body.reason_code,
      "a quotation from four turns ago is not what the caller just said; an unbounded search would let the agent re-quote the opening sentence to justify any later field",
    ).toBe("E_PROVENANCE_NOT_FOUND")
    expect(
      evidenceOf(body).searched_turns,
      "the refusal states the window it used, which is what makes the bound reviewable rather than a hidden constant",
    ).toEqual([2, 3, 4])
  })
})
