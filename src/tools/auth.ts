import { ToolAuthError } from "@/domain"

export const TOOL_SECRET_HEADER = "x-readback-tool-secret"

export function constantTimeEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  const length = Math.max(left.length, right.length)
  let mismatch = left.length === right.length ? 0 : 1
  for (let i = 0; i < length; i += 1) {
    mismatch |= (left[i] ?? 0) ^ (right[i] ?? 0)
  }
  return mismatch === 0
}

export function assertToolSecret(headers: Headers): void {
  const expected = process.env.AGENT_TOOL_SECRET
  if (expected === undefined || expected.trim().length === 0) {
    throw new ToolAuthError("the server has no AGENT_TOOL_SECRET configured")
  }
  const given = headers.get(TOOL_SECRET_HEADER) ?? ""
  if (!constantTimeEquals(given, expected)) {
    throw new ToolAuthError()
  }
}
