import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { beforeEach, describe, expect, it } from "vitest"
import { FieldName, ReasonCode } from "@/domain"
import { intakeFor } from "@/tools"
import { call, resetToolEnvironment, SESSION, seedTurn } from "./harness"

beforeEach(resetToolEnvironment)

type Proposal = {
  readonly field: FieldName
  readonly value: string
  readonly hint: string
}

async function propose(input: Proposal): Promise<Record<string, unknown>> {
  const response = await proposeField(
    call("propose-field", {
      session_id: SESSION,
      field: input.field,
      value: input.value,
      transcript_hint: input.hint,
    }),
  )
  return (await response.json()) as Record<string, unknown>
}

describe("a proposed value must be accounted for by the words that were spoken", () => {
  it("refuses bisoprolol when the human said lisinopril, even though the hint traces", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "bisoprolol",
      hint: "lisinopril ten milligrams",
    })

    expect(
      body.reason_code,
      "this is the whole product: the agent supplied a LASA counterpart nobody said, with a hint that really does trace to the turn, so provenance alone waves it through and only reconciling the value against the speech stops it",
    ).toBe(ReasonCode.ValidatorCombo)
    expect(
      body.written_to_order,
      "a value nobody spoke must never reach the order under any action",
    ).toBe(false)
    expect(
      intakeFor(SESSION).order.fields.size,
      "propose_field writes nothing at all, so the order stays empty regardless of the reason",
    ).toBe(0)
  })

  it("keeps the mismatch inside the validator-failure reason rather than inventing a fourth one", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "bisoprolol",
      hint: "lisinopril",
    })

    expect(
      body.reason_code,
      "there are exactly three reasons to re-ask and a disagreement with the speech is the validator one; a new top-level code here would make it four and destroy the claim the product is built on",
    ).toBe(ReasonCode.ValidatorCombo)
    const collapsed: readonly ReasonCode[] = [ReasonCode.LowConfidence, ReasonCode.LasaHit]
    expect(
      collapsed.includes(body.reason_code as ReasonCode),
      "the mismatch must not be smuggled in as low confidence or as a LASA hit; the recognizer was certain and the reason is not homophony",
    ).toBe(false)
  })

  it("says something different from the untraceable-hint refusal", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const untraceable = await propose({
      field: FieldName.DrugName,
      value: "warfarin",
      hint: "warfarin",
    })

    resetToolEnvironment()
    seedTurn("lisinopril ten milligrams", 0.99)
    const unsupported = await propose({
      field: FieldName.DrugName,
      value: "bisoprolol",
      hint: "lisinopril ten milligrams",
    })

    expect(untraceable.reason_code).toBe("E_PROVENANCE_NOT_FOUND")
    expect(
      unsupported.say_to_caller,
      "a hint that cannot be traced and a hint that traces to words which do not support the value are different failures; one sentence for both would tell the caller to repeat when the real problem is that the agent wrote down a different drug",
    ).not.toBe(untraceable.say_to_caller)
    expect(
      unsupported.say_to_caller,
      "the refusal has to name what was actually heard, otherwise the caller cannot tell what went wrong",
    ).toContain("lisinopril")
    expect(
      unsupported.candidate_id,
      "unlike the untraceable case this value did reach the gate, so it has a candidate id the agent can read back against",
    ).not.toBeNull()
  })

  it("accepts a normalized strength against the words that were spoken", async () => {
    seedTurn("azithromycin two hundred milligrams", 0.99)
    const body = await propose({
      field: FieldName.Strength,
      value: "200 mg",
      hint: "two hundred milligrams",
    })

    expect(
      body.reason_code,
      'turning "two hundred milligrams" into "200 mg" is the normalizer doing its job; refusing it would make the reconciliation check fight the rest of the pipeline',
    ).not.toBe(ReasonCode.ValidatorCombo)
    expect(body.candidate_id).not.toBeNull()
  })

  it("accepts a spelled-out NPI, because digits read aloud are still the digits", async () => {
    seedTurn("one two four five three one nine five nine nine", 0.99)
    const body = await propose({
      field: FieldName.PrescriberNpi,
      value: "1245319599",
      hint: "one two four five three one nine five nine nine",
    })

    expect(
      body.reason_code,
      "an NPI is dictated digit by digit and the value is the compacted number; a check that cannot see through spell-out would refuse every identifier the product asks to be spelled",
    ).not.toBe(ReasonCode.ValidatorCombo)
    expect(body.action).toBe("accept")
  })

  it("accepts a spelled-out DEA number the same way", async () => {
    seedTurn("AB one two three four five six three", 0.99)
    const body = await propose({
      field: FieldName.PrescriberDea,
      value: "AB1234563",
      hint: "AB one two three four five six three",
    })

    expect(
      body.reason_code,
      "the DEA number carries its own mod-10 proof, so reconciliation must not block the very dictation style the gate asks for when the checksum fails",
    ).not.toBe(ReasonCode.ValidatorCombo)
    expect(body.action).toBe("accept")
  })

  it("accepts the drug name when the speaker added the salt", async () => {
    seedTurn("tramadol hydrochloride fifty milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "tramadol",
      hint: "tramadol hydrochloride",
    })

    expect(
      body.reason_code,
      'SUBSTANCENAME stores "tramadol hydrochloride" and speakers say the salt out loud, so treating the suffix as an unsupported token would refuse a correct name',
    ).not.toBe(ReasonCode.ValidatorCombo)
    expect(
      body.reason_code,
      "tramadol is on the curated pair table, so with the value supported the gate must still reach the LASA branch rather than stopping earlier",
    ).toBe(ReasonCode.LasaHit)
  })

  it("accepts the salt in the value when the speaker said only the base name", async () => {
    seedTurn("tramadol fifty milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "tramadol hydrochloride",
      hint: "tramadol",
    })

    expect(
      body.reason_code,
      "the catalogue name carries the salt and the speaker does not have to; the direction of the difference cannot change whether the value counts as spoken",
    ).not.toBe(ReasonCode.ValidatorCombo)
  })

  it("lets a value that really is in the words through, so the check is not refusing everything", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "lisinopril",
      hint: "lisinopril",
    })

    expect(
      body.reason_code,
      "the negative control: a check that refused this too would be indistinguishable from a broken pipeline and the false-ask rate we publish would be one",
    ).toBe(ReasonCode.LasaHit)
    expect(body.candidate_id).not.toBeNull()
  })

  it("tolerates the vowel drift a recognizer really produces", async () => {
    seedTurn("venorelbine ten milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "vinorelbine",
      hint: "venorelbine",
    })

    expect(
      body.reason_code,
      "venorelbine and vinorelbine share a consonant skeleton, which is the recorded recognition error and not a substitution; calling it unsupported would hide the catalogue verdict that is the honest answer here",
    ).not.toBe(ReasonCode.ValidatorCombo)
  })

  it("carries the words it heard as evidence, not just a refusal", async () => {
    seedTurn("lisinopril ten milligrams", 0.99)
    const body = await propose({
      field: FieldName.DrugName,
      value: "bisoprolol",
      hint: "lisinopril ten milligrams",
    })
    const evidence = body.evidence as Record<string, unknown>

    expect(
      evidence.spoken_text,
      "numbers and refusals without a method are forbidden; the refusal has to expose the words it compared against so the disagreement can be audited after the call",
    ).toContain("lisinopril")
    expect(
      evidence.unsupported_tokens,
      "the evidence must name which part of the value nothing spoken accounts for",
    ).toContain("bisoprolol")
  })
})
