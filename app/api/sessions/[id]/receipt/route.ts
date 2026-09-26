import { NextResponse } from "next/server"
import { NO_RECEIPT_CODE, ReadbackError, usableSessionId } from "@/domain"
import { fhirBundleFor, originFromEnv, recheckReceipt, sessionStore } from "@/sessions"
import { loadIntake, receiptOf, toolCatalog } from "@/tools"

export const dynamic = "force-dynamic"

export const maxDuration = 30

async function findReceipt(id: string) {
  const stored = await sessionStore().get(id)
  if (stored?.receipt !== undefined && stored.receipt !== null) {
    return stored.receipt
  }
  const state = await loadIntake(id)
  return state === null ? null : receiptOf(state, originFromEnv(process.env))
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: raw } = await context.params
  const id = usableSessionId(raw)
  if (id === null) {
    return NextResponse.json({ error: "the session id is not usable" }, { status: 400 })
  }
  try {
    const receipt = await findReceipt(id)
    if (receipt === null) {
      return NextResponse.json(
        {
          error: `session ${id} has no committed order, so there is no receipt; a refused or unfinished order is never issued one`,
          code: NO_RECEIPT_CODE,
        },
        { status: 404 },
      )
    }
    return NextResponse.json(
      {
        receipt,
        fhir: fhirBundleFor(receipt),
        recheck: await recheckReceipt(receipt, toolCatalog()),
      },
      { headers: { "cache-control": "no-store" } },
    )
  } catch (error) {
    if (error instanceof ReadbackError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 503 })
    }
    throw error
  }
}
