import {
  MicrophoneFailureReason,
  MicrophonePermissionError,
  requestMicrophone,
} from "@/audio/microphone"
import { BUDGET_EXHAUSTED_CODE, type BudgetStatus, SocketParamError } from "@/domain"
import type { AgentClient } from "@/realtime/agent-client"
import type { SttClient } from "@/realtime/stt-client"
import { TokenMintError } from "@/realtime/tokens"
import { SocketOpenError } from "@/realtime/transport"
import type { FaultDetail } from "./session-options"
import { SessionFault } from "./session-status"
import { ConnectTimedOut } from "./session-timers"

const FAULT_OF_REASON: Readonly<Record<MicrophoneFailureReason, SessionFault>> = Object.freeze({
  [MicrophoneFailureReason.Denied]: SessionFault.MicrophoneDenied,
  [MicrophoneFailureReason.NoDevice]: SessionFault.MicrophoneAbsent,
  [MicrophoneFailureReason.DeviceBusy]: SessionFault.MicrophoneBusy,
  [MicrophoneFailureReason.InsecureContext]: SessionFault.InsecureContext,
  [MicrophoneFailureReason.Unknown]: SessionFault.MicrophoneDenied,
})

const BUDGET_ROUTE = "/api/budget"
const CREDIT_EXHAUSTED_STATUS = 402

export function faultForConnectError(error: unknown): SessionFault {
  if (error instanceof SocketParamError) {
    return SessionFault.SocketParamRefused
  }
  if (error instanceof ConnectTimedOut) {
    return SessionFault.ConnectTimedOut
  }
  if (error instanceof SocketOpenError) {
    return SessionFault.SocketUnreachable
  }
  if (!(error instanceof TokenMintError)) {
    return SessionFault.TokenFailed
  }
  if (error.refusalCode === BUDGET_EXHAUSTED_CODE) {
    return SessionFault.BudgetExhausted
  }
  if (error.status === CREDIT_EXHAUSTED_STATUS) {
    return SessionFault.CreditsExhausted
  }
  if (error.status === 429) {
    return SessionFault.ConcurrencyReached
  }
  return SessionFault.TokenFailed
}

export function detailOf(error: unknown): { code: string; message: string } | null {
  if (error instanceof SocketParamError) {
    return { code: error.code, message: error.message }
  }
  if (error instanceof TokenMintError && error.explanation !== null) {
    return { code: error.refusalCode ?? `HTTP ${error.status}`, message: error.explanation }
  }
  return null
}

const BUDGET_SPENT_DETAIL = "the daily socket budget is spent until the next UTC day"

export async function budgetRefusal(): Promise<FaultDetail | null> {
  try {
    const response = await fetch(BUDGET_ROUTE, { method: "GET", cache: "no-store" })
    if (!response.ok) {
      return null
    }
    const body = (await response.json()) as {
      readonly budget?: Partial<BudgetStatus>
      readonly explanation?: unknown
    }
    if (body.budget?.exhausted !== true) {
      return null
    }
    const message =
      typeof body.explanation === "string" && body.explanation.length > 0
        ? body.explanation
        : BUDGET_SPENT_DETAIL
    return { code: BUDGET_EXHAUSTED_CODE, message }
  } catch {
    return null
  }
}

export async function abandon(
  stream: MediaStream,
  agent: AgentClient,
  stt: SttClient,
): Promise<void> {
  await Promise.allSettled([agent.end(), stt.end()])
  stopTracks(stream)
}

export function stopTracks(stream: MediaStream): void {
  for (const track of stream.getTracks()) {
    track.stop()
  }
}

export function faultForMicrophoneError(error: unknown): SessionFault {
  return error instanceof MicrophonePermissionError
    ? FAULT_OF_REASON[error.reason]
    : SessionFault.MicrophoneDenied
}

export async function acquireStream(
  isCurrent: () => boolean,
  block: (fault: SessionFault, detail: FaultDetail | null) => void,
): Promise<MediaStream | null> {
  const refusal = await budgetRefusal()
  if (!isCurrent()) {
    return null
  }
  if (refusal !== null) {
    block(SessionFault.BudgetExhausted, refusal)
    return null
  }
  try {
    const stream = await requestMicrophone()
    if (isCurrent()) {
      return stream
    }
    stopTracks(stream)
  } catch (error) {
    if (isCurrent()) {
      block(faultForMicrophoneError(error), null)
    }
  }
  return null
}
