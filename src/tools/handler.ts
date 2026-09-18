import type { z } from "zod"
import { ReadbackError, ToolAuthError } from "@/domain"
import { assertToolSecret } from "./auth"
import { argumentRefusal, fitsToolLimit, type ToolPayload } from "./respond"

export type ToolResult = {
  readonly status: number
  readonly payload: ToolPayload
}

export async function runTool<T>(
  request: Request,
  schema: z.ZodType<T>,
  handle: (input: T) => Promise<ToolPayload> | ToolPayload,
): Promise<ToolResult> {
  try {
    assertToolSecret(request.headers)
  } catch (error) {
    if (error instanceof ToolAuthError) {
      return { status: 401, payload: { error: error.message, code: error.code } }
    }
    throw error
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return { status: 400, payload: { error: "the request body was not valid JSON" } }
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return { status: 400, payload: argumentRefusal(parsed.error.issues) }
  }

  try {
    const payload = await handle(parsed.data)
    if (!fitsToolLimit(payload)) {
      return {
        status: 500,
        payload: {
          error: "the tool response exceeded the 8 KiB limit AssemblyAI truncates at",
        },
      }
    }
    return { status: 200, payload }
  } catch (error) {
    if (error instanceof ReadbackError) {
      return { status: 422, payload: { error: error.message, code: error.code } }
    }
    return { status: 500, payload: { error: "the tool failed unexpectedly" } }
  }
}
