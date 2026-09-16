import { NextResponse } from "next/server"
import { z } from "zod"
import { searchDrugs } from "@/catalog"
import { lasaRiskFor } from "@/lasa"
import { runTool, toolCatalog } from "@/tools"
import { spokenValueField } from "@/tools/input-bounds"

export const dynamic = "force-dynamic"

const schema = z.object({
  query: spokenValueField(),
  limit: z.number().int().min(1).max(5).optional(),
})

const MAX_COMBOS = 6
const MAX_BRANDS = 4

export async function POST(request: Request): Promise<NextResponse> {
  const { status, payload } = await runTool(request, schema, (input) => {
    const catalog = toolCatalog()
    const limit = input.limit ?? 3
    const matches = searchDrugs(catalog, input.query, limit).map((m) => ({
      nonproprietary_name: m.drug.nonproprietaryName,
      proprietary_names: m.drug.proprietaryNames.slice(0, MAX_BRANDS),
      combos: m.drug.combos.slice(0, MAX_COMBOS).map((c) => ({
        strength: c.strength,
        dosage_form: c.dosageForm,
        route: c.route,
      })),
      dea_schedule: m.drug.deaSchedule,
      match_kind: m.matchKind,
    }))

    const lasa = lasaRiskFor(input.query)

    return {
      matches,
      lasa_warning: lasa.hit
        ? {
            hit: true,
            matched_term: lasa.matchedTerm,
            confusable_with: [...lasa.confusableWith],
            source: lasa.source,
          }
        : { hit: false },
      note: lasa.hit
        ? "Sound-alike risk detected. You must call read_back before propose_field."
        : null,
    }
  })

  return NextResponse.json(payload, { status })
}
