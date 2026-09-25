import type { z } from "zod"
import {
  ReadbackError,
  SessionStorageError,
  ToolAuthError,
  UNKNOWN_SESSION_CODE,
  UnknownSessionError,
  usableSessionId,
} from "@/domain"
import { assertToolSecret } from "./auth"
import { isRegisteredSession } from "./intake-access"
import { argumentRefusal, fitsToolLimit, type ToolPayload } from "./respond"

export type ToolResult = {
  readonly status: number
  readonly payload: ToolPayload
}

export const SESSION_QUERY_PARAM = "sid"

function unknownSessionPayload(sessionId: string | null): ToolPayload {
  return {
    error:
      sessionId === null
        ? "the tool URL carried no usable session id"
        : `no registered session ${sessionId}`,
    code: UNKNOWN_SESSION_CODE,
    written_to_order: false,
    say_to_caller:
      "I have lost track of this call on my side, so nothing more can be recorded. Please hang up and call again.",
    how_to_fix:
      "Do not retry this tool and do not tell the caller any value was recorded. The session is bound through the tool URL, not through any argument you supply.",
  }
}

function withinLimit(payload: ToolPayload, status: number): ToolResult {
  if (!fitsToolLimit(payload)) {
    return {
      status: 500,
      payload: { error: "the tool response exceeded the 8 KiB limit AssemblyAI truncates at" },
    }
  }
  return { status, payload }
}

function failure(error: unknown): ToolResult {
  if (error instanceof UnknownSessionError) {
    return { status: 404, payload: { ...unknownSessionPayload(null), error: error.message } }
  }
  if (error instanceof SessionStorageError) {
    return { status: 503, payload: { error: error.message, code: error.code } }
  }
  if (error instanceof ReadbackError) {
    return { status: 422, payload: { error: error.message, code: error.code } }
  }
  return { status: 500, payload: { error: "the tool failed unexpectedly" } }
}

async function authorizedBody(
  request: Request,
): Promise<{ ok: true; body: unknown } | { ok: false; result: ToolResult }> {
  try {
    assertToolSecret(request.headers)
  } catch (error) {
    if (error instanceof ToolAuthError) {
      return {
        ok: false,
        result: { status: 401, payload: { error: error.message, code: error.code } },
      }
    }
    throw error
  }
  try {
    return { ok: true, body: await request.json() }
  } catch {
    return {
      ok: false,
      result: { status: 400, payload: { error: "the request body was not valid JSON" } },
    }
  }
}

export async function runTool<T>(
  request: Request,
  schema: z.ZodType<T>,
  handle: (input: T) => Promise<ToolPayload> | ToolPayload,
): Promise<ToolResult> {
  const read = await authorizedBody(request)
  if (!read.ok) {
    return read.result
  }
  const parsed = schema.safeParse(read.body)
  if (!parsed.success) {
    return { status: 400, payload: argumentRefusal(parsed.error.issues) }
  }
  try {
    return withinLimit(await handle(parsed.data), 200)
  } catch (error) {
    return failure(error)
  }
}

function sessionIdFromToolUrl(request: Request): string | null {
  const raw = new URL(request.url).searchParams.get(SESSION_QUERY_PARAM)
  return raw === null ? null : usableSessionId(raw)
}

export async function runSessionTool<T>(
  request: Request,
  schema: z.ZodType<T>,
  handle: (input: T, sessionId: string) => Promise<ToolResult>,
): Promise<ToolResult> {
  const read = await authorizedBody(request)
  if (!read.ok) {
    return read.result
  }
  const sessionId = sessionIdFromToolUrl(request)
  try {
    if (sessionId === null || !(await isRegisteredSession(sessionId))) {
      return { status: 404, payload: unknownSessionPayload(sessionId) }
    }
  } catch (error) {
    return failure(error)
  }
  const parsed = schema.safeParse(read.body)
  if (!parsed.success) {
    return { status: 400, payload: argumentRefusal(parsed.error.issues) }
  }
  try {
    const result = await handle(parsed.data, sessionId)
    return withinLimit(result.payload, result.status)
  } catch (error) {
    return failure(error)
  }
}
