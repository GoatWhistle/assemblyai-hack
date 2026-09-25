import type { OrderWitness } from "@/domain"
import {
  parseTimeline,
  type SessionTimeline,
  unavailableFields,
  vendorUserTranscripts,
  WITNESS_SOURCE,
  type WitnessedField,
  witnessOrderFields,
} from "./witness"

export const VENDOR_SESSIONS_URL = "https://agents.assemblyai.com/v1/sessions"

const WITNESS_RETRY_DELAYS_MS: readonly number[] = [0, 2000, 3000, 4000]

const REQUEST_TIMEOUT_MS = 5000

const MAX_VENDOR_SESSIONS = 3

export type WitnessFetch = (url: string, init: RequestInit) => Promise<Response>

type Timelines =
  | {
      readonly ok: true
      readonly sessionIds: readonly string[]
      readonly timelines: readonly SessionTimeline[]
    }
  | { readonly ok: false; readonly sessionIds: readonly string[]; readonly reason: string }

type Io = {
  readonly apiKey: string
  readonly doFetch: WitnessFetch
  readonly sleep: (ms: number) => Promise<void>
  readonly delaysMs: readonly number[]
}

async function getJson(io: Io, url: string, authorised: boolean): Promise<unknown> {
  const response = await io.doFetch(url, {
    headers: authorised ? { Authorization: `Bearer ${io.apiKey}` } : {},
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`${authorised ? url : "the timeline artifact"} answered ${response.status}`)
  }
  return response.json()
}

function sessionIdsOf(body: unknown, agentId: string): readonly string[] {
  const sessions = (body as { sessions?: unknown } | null)?.sessions
  if (!Array.isArray(sessions)) {
    return []
  }
  return sessions
    .filter(
      (entry): entry is { id: string; agent_id?: unknown } => typeof entry?.id === "string",
    )
    .filter((entry) => entry.agent_id === agentId)
    .map((entry) => entry.id)
    .slice(0, MAX_VENDOR_SESSIONS)
}

function timelineUrlOf(body: unknown): string | null {
  const artifacts = (body as { artifacts?: unknown } | null)?.artifacts
  if (!Array.isArray(artifacts)) {
    return null
  }
  const entry = artifacts.find(
    (artifact) => artifact?.type === "timeline" && typeof artifact?.url === "string",
  )
  return entry === undefined ? null : String(entry.url)
}

async function timelineOf(io: Io, sessionId: string): Promise<SessionTimeline | string> {
  let waitedMs = 0
  for (const delay of io.delaysMs) {
    await io.sleep(delay)
    waitedMs += delay
    const session = await getJson(
      io,
      `${VENDOR_SESSIONS_URL}/${encodeURIComponent(sessionId)}`,
      true,
    )
    const url = timelineUrlOf(session)
    if (url !== null) {
      const timeline = parseTimeline(await getJson(io, url, false))
      return timeline ?? `the timeline of ${sessionId} does not parse as a session timeline`
    }
  }
  return `the vendor had not published the timeline of ${sessionId} ${waitedMs / 1000} s after finalize began`
}

async function fetchVendorTimelines(input: {
  apiKey: string
  agentId: string
  doFetch?: WitnessFetch
  sleep?: (ms: number) => Promise<void>
  delaysMs?: readonly number[]
}): Promise<Timelines> {
  const io: Io = {
    apiKey: input.apiKey,
    doFetch: input.doFetch ?? fetch,
    sleep: input.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms))),
    delaysMs: input.delaysMs ?? WITNESS_RETRY_DELAYS_MS,
  }
  let sessionIds: readonly string[] = []
  try {
    const listUrl = `${VENDOR_SESSIONS_URL}?agent_id=${encodeURIComponent(input.agentId)}&limit=10`
    sessionIds = sessionIdsOf(await getJson(io, listUrl, true), input.agentId)
    if (sessionIds.length === 0) {
      return {
        ok: false,
        sessionIds,
        reason: `the vendor lists no session for agent ${input.agentId}`,
      }
    }
    const timelines: SessionTimeline[] = []
    for (const id of sessionIds) {
      const timeline = await timelineOf(io, id)
      if (typeof timeline === "string") {
        return { ok: false, sessionIds, reason: timeline }
      }
      timelines.push(timeline)
    }
    return { ok: true, sessionIds, timelines }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    return { ok: false, sessionIds, reason: `the vendor could not be read: ${message}` }
  }
}

export async function witnessOrder(input: {
  apiKey: string | null
  agentId: string
  fields: readonly WitnessedField[]
  nowIso: string
  doFetch?: WitnessFetch
  sleep?: (ms: number) => Promise<void>
  delaysMs?: readonly number[]
}): Promise<OrderWitness> {
  const base = { source: WITNESS_SOURCE, checkedAt: input.nowIso }
  const skipped =
    input.fields.length === 0
      ? "no field reached the order, so there was nothing to witness and the vendor was not asked"
      : input.apiKey === null || input.apiKey.length === 0
        ? "the server has no AssemblyAI key, so the vendor was not asked"
        : null
  if (skipped !== null || input.apiKey === null) {
    const reason = skipped ?? "the vendor was not asked"
    return {
      ...base,
      vendorSessionIds: [],
      vendorUserTurnCount: 0,
      unavailableReason: reason,
      fields: unavailableFields(input.fields, reason),
    }
  }
  const found = await fetchVendorTimelines({ ...input, apiKey: input.apiKey })
  if (!found.ok) {
    return {
      ...base,
      vendorSessionIds: found.sessionIds,
      vendorUserTurnCount: 0,
      unavailableReason: found.reason,
      fields: unavailableFields(input.fields, found.reason),
    }
  }
  return {
    ...base,
    vendorSessionIds: found.sessionIds,
    vendorUserTurnCount: vendorUserTranscripts(found.timelines).length,
    unavailableReason: null,
    fields: witnessOrderFields(input.fields, found.timelines),
  }
}
