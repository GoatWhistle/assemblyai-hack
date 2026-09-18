const MAX_TOOL_RESPONSE_BYTES = 8 * 1024

export type ToolPayload = Record<string, unknown>

function byteLength(value: string): number {
  return Buffer.byteLength(value, "utf8")
}

export function fitsToolLimit(payload: ToolPayload): boolean {
  return byteLength(JSON.stringify(payload)) <= MAX_TOOL_RESPONSE_BYTES
}

export const ARGUMENT_REFUSED = "E_ARGUMENTS_REJECTED"

export type ArgumentIssue = {
  readonly path: readonly (string | number | symbol)[]
  readonly message: string
}

const MAX_REPORTED_ARGUMENTS = 10

export function argumentRefusal(issues: readonly ArgumentIssue[]): ToolPayload {
  const fields = issues.slice(0, MAX_REPORTED_ARGUMENTS).map((issue) => ({
    argument: issue.path.map((p) => String(p)).join(".") || "(root)",
    problem: issue.message,
  }))
  return {
    error: "the arguments were rejected and nothing was written to the order",
    code: ARGUMENT_REFUSED,
    written_to_order: false,
    rejected_arguments: fields,
    omitted_argument_count: Math.max(0, issues.length - fields.length),
    say_to_caller: null,
    how_to_fix:
      "Correct the listed arguments and call this tool again. Do not restate the value to the caller as accepted, and do not proceed to commit_order; no value entered the order.",
  }
}
