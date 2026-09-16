export const MAX_TOOL_RESPONSE_BYTES = 8 * 1024

export type ToolPayload = Record<string, unknown>

export function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8")
}

export function fitsToolLimit(payload: ToolPayload): boolean {
  return byteLength(JSON.stringify(payload)) <= MAX_TOOL_RESPONSE_BYTES
}

export function truncateToLimit(
  payload: ToolPayload,
  shrink: (payload: ToolPayload) => ToolPayload | null,
): ToolPayload {
  let current = payload
  while (!fitsToolLimit(current)) {
    const smaller = shrink(current)
    if (smaller === null) {
      return {
        error: "the tool response exceeded the 8 KiB limit and could not be shrunk",
        truncated: true,
      }
    }
    current = smaller
  }
  return current
}
