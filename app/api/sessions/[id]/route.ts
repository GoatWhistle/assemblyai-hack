import { NextResponse } from "next/server"
import { sessionStore } from "@/sessions"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params
  const store = sessionStore()
  const session = await store.get(id)

  if (session === null) {
    return NextResponse.json({ error: `no stored session ${id}` }, { status: 404 })
  }

  return NextResponse.json({ ...session, storage: store.backend() })
}
