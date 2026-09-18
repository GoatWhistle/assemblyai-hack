import { NextResponse } from "next/server"
import { usableSessionId } from "@/domain"
import { sessionStore } from "@/sessions"

export const dynamic = "force-dynamic"

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id: raw } = await context.params
  const id = usableSessionId(raw)
  if (id === null) {
    return NextResponse.json({ error: "the session id is not usable" }, { status: 400 })
  }
  const store = sessionStore()
  const session = await store.get(id)

  if (session === null) {
    return NextResponse.json({ error: `no stored session ${id}` }, { status: 404 })
  }

  return NextResponse.json({ ...session, storage: store.backend() })
}
