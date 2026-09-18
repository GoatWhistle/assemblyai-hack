import { createHash, timingSafeEqual } from "node:crypto"
import { ToolAuthError } from "@/domain"

export const TOOL_SECRET_HEADER = "x-readback-tool-secret"

export const MIN_TOOL_SECRET_CHARS = 16

function digest(value: string): Buffer {
  return createHash("sha256").update(value, "utf8").digest()
}

export function constantTimeEquals(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b))
}

export function assertToolSecret(headers: Headers): void {
  const expected = process.env.AGENT_TOOL_SECRET
  if (expected === undefined || expected.trim().length === 0) {
    throw new ToolAuthError("the server has no AGENT_TOOL_SECRET configured")
  }
  if (expected.trim().length < MIN_TOOL_SECRET_CHARS) {
    throw new ToolAuthError("the configured AGENT_TOOL_SECRET is too short to be a secret")
  }
  const given = headers.get(TOOL_SECRET_HEADER) ?? ""
  if (!constantTimeEquals(given, expected)) {
    throw new ToolAuthError()
  }
}
