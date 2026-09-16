import { NextResponse } from "next/server"
import { z } from "zod"
import { deaScheduleFor } from "@/catalog"
import { notApplicableVerdict } from "@/domain"
import { runTool, toolCatalog } from "@/tools"
import { validateDea, validateNpi } from "@/validators"

export const dynamic = "force-dynamic"

const schema = z.object({
  npi: z.string().regex(/^\d{10}$/, "npi must be exactly 10 digits, no separators"),
  dea: z
    .string()
    .regex(/^[A-Za-z]{2}\d{7}$/, "dea must be two letters followed by seven digits")
    .optional(),
  drug_name: z.string().optional(),
})

function shape(verdict: ReturnType<typeof validateNpi>): Record<string, unknown> {
  return {
    outcome: verdict.outcome,
    validator_name: verdict.validatorName,
    rule_cited: verdict.ruleCited,
    detail: verdict.detail,
    evidence: verdict.evidence,
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runTool(request, schema, (input) => {
    const npi = validateNpi(input.npi)

    let schedule: string | null = null
    if (input.drug_name !== undefined) {
      schedule = deaScheduleFor(toolCatalog(), input.drug_name)
    }

    const dea = input.dea === undefined ? notApplicableVerdict("") : validateDea(input.dea)

    return {
      npi: shape(npi),
      dea:
        input.dea === undefined
          ? {
              outcome: dea.outcome,
              validator_name: "dea_mod10",
              rule_cited:
                schedule === null
                  ? "no DEA required: the proposed drug carries no DEA schedule in the built catalogue"
                  : `the proposed drug is schedule ${schedule}; a DEA number is required`,
              detail:
                schedule === null
                  ? "dea_schedule is null for the proposed drug"
                  : "dea was not supplied",
              evidence: { deaSchedule: schedule },
            }
          : shape(dea),
      registry_lookup: null,
    }
  })

  return NextResponse.json(payload, { status })
}
