import { POST as commitOrder } from "@app/api/tools/commit-order/route"
import { POST as proposeField } from "@app/api/tools/propose-field/route"
import { POST as readBack } from "@app/api/tools/read-back/route"
import { call, readBackAloud, SESSION, seedTurn } from "./harness"

export const COMMITTED_INTAKE: readonly { readonly field: string; readonly value: string }[] = [
  { field: "drug_name", value: "phenylephrine hydrochloride" },
  { field: "dosage_form", value: "INJECTION" },
  { field: "route", value: "INTRAVENOUS" },
  { field: "strength", value: "100 mg/10mL" },
  { field: "quantity", value: "thirty" },
  { field: "sig", value: "1 tablet by mouth once daily" },
  { field: "prescriber_npi", value: "1245319599" },
  { field: "prescriber_dea", value: "AB1234563" },
]

export async function commitHonestOrder(session = SESSION): Promise<Record<string, unknown>> {
  await confirmHonestIntake(session)
  return (
    await commitOrder(
      call(
        "commit-order",
        {
          full_order_read_back: "Reading the whole order back. Correct?",
          caller_confirmed: true,
        },
        undefined,
        session,
      ),
    )
  ).json()
}

export async function confirmHonestIntake(session = SESSION): Promise<void> {
  for (const input of COMMITTED_INTAKE) {
    await seedTurn(input.value, 0.99, undefined, session)
    const proposed = await (
      await proposeField(
        call(
          "propose-field",
          { field: input.field, value: input.value, transcript_hint: input.value },
          undefined,
          session,
        ),
      )
    ).json()
    const line = `Confirming ${input.field}: ${input.value}. Correct?`
    await readBackAloud(line, "yes", session)
    await readBack(
      call(
        "read-back",
        {
          field: input.field,
          candidate_id: proposed.candidate_id,
          utterance: line,
          caller_answer: "yes",
        },
        undefined,
        session,
      ),
    )
  }
}
