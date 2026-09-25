import {
  pacingDisablingAgentInput,
  SocketParamError,
  undocumentedAgentInput,
  undocumentedSttParams,
  unknownSocketParams,
} from "@/domain"

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function guardSttQuery(params: Readonly<Record<string, unknown>>): void {
  const offending = undocumentedSttParams(params, "connect")
  if (offending.length > 0) {
    throw new SocketParamError("stt", offending)
  }
}

export function guardSttUpdate(message: Readonly<Record<string, unknown>>): void {
  const offending = undocumentedSttParams(message, "update")
  if (offending.length > 0) {
    throw new SocketParamError("stt", offending)
  }
}

function guardAgentPacing(input: Readonly<Record<string, unknown>>): void {
  const forbidden = pacingDisablingAgentInput(input)
  if (forbidden.length > 0) {
    throw new SocketParamError(
      "agent",
      forbidden.map((key) => `input.${key}`),
      "disables_pacing",
    )
  }
}

export function guardAgentInput(input: Readonly<Record<string, unknown>>): void {
  guardAgentPacing(input)
  const offending = undocumentedAgentInput(input)
  if (offending.length > 0) {
    throw new SocketParamError(
      "agent",
      offending.map((key) => `input.${key}`),
    )
  }
}

export function guardAgentSession(session: Readonly<Record<string, unknown>>): void {
  const offending = [...unknownSocketParams("agent_session", Object.keys(session))]
  if (isRecord(session.input)) {
    guardAgentPacing(session.input)
    offending.push(...undocumentedAgentInput(session.input).map((key) => `input.${key}`))
  }
  if (offending.length > 0) {
    throw new SocketParamError("agent", offending)
  }
}
