import { useCallback, useRef, useState } from "react"
import { type DemoRunResult, FIELD_NAMES, GateAction, REASON_CODES } from "@/domain"
import type { ProbeId } from "./scenarios"

export type { DemoRunResult } from "@/domain"

export const DEMO_RUN_PATH = "/api/demo/run"

export type ServerRunState =
  | { readonly phase: "idle" }
  | { readonly phase: "loading"; readonly scenario: ProbeId }
  | { readonly phase: "done"; readonly scenario: ProbeId; readonly result: DemoRunResult }
  | {
      readonly phase: "failed"
      readonly scenario: ProbeId
      readonly status: number | null
      readonly message: string
    }

const ACTIONS: readonly unknown[] = Object.values(GateAction)
const CODES: readonly unknown[] = REASON_CODES
const FIELDS: readonly unknown[] = FIELD_NAMES

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isDemoRunResult(value: unknown, scenario: ProbeId): value is DemoRunResult {
  if (!isRecord(value) || !isRecord(value.decision)) {
    return false
  }
  const decision = value.decision
  return (
    value.scenario === scenario &&
    typeof value.reasonCode === "string" &&
    typeof value.spoken === "string" &&
    typeof value.proposedValue === "string" &&
    value.writtenToOrder === false &&
    (value.sayToCaller === null || typeof value.sayToCaller === "string") &&
    ACTIONS.includes(decision.action) &&
    CODES.includes(decision.reasonCode) &&
    FIELDS.includes(decision.field) &&
    typeof decision.candidateId === "string" &&
    typeof decision.agentUtterance === "string" &&
    isRecord(decision.evidence)
  )
}

function failed(scenario: ProbeId, status: number | null, message: string): ServerRunState {
  return { phase: "failed", scenario, status, message }
}

async function runOnServer(scenario: ProbeId): Promise<ServerRunState> {
  let response: Response
  try {
    response = await fetch(DEMO_RUN_PATH, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ scenario }),
    })
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error)
    return failed(scenario, null, `the request did not reach the server: ${reason}`)
  }
  if (!response.ok) {
    return failed(scenario, response.status, `the server answered HTTP ${response.status}`)
  }
  let body: unknown
  try {
    body = await response.json()
  } catch {
    return failed(scenario, response.status, "the server answered with a body that is not JSON")
  }
  if (!isDemoRunResult(body, scenario)) {
    return failed(
      scenario,
      response.status,
      "the server answered with a body that is not a demo run result for this scenario",
    )
  }
  return { phase: "done", scenario, result: body }
}

export function useServerRun(): {
  readonly state: ServerRunState
  readonly run: (scenario: ProbeId) => void
} {
  const [state, setState] = useState<ServerRunState>({ phase: "idle" })
  const latest = useRef(0)

  const run = useCallback((scenario: ProbeId) => {
    latest.current += 1
    const ticket = latest.current
    setState({ phase: "loading", scenario })
    void runOnServer(scenario).then((next) => {
      if (ticket === latest.current) {
        setState(next)
      }
    })
  }, [])

  return { state, run }
}
