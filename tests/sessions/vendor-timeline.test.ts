import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { VENDOR_SESSIONS_URL, type WitnessFetch, witnessOrder } from "@/sessions"
import sessionRecord from "../../eval/fixtures/witness/session-record-shape.json"
import timeline from "../../eval/fixtures/witness/timeline-recorded-shape.json"

const AGENT = "agent_witness_test"
const SESSION = "sess_b5f7793876a544baae0299c9d9fe6aad"
const TIMELINE_URL = "https://artifacts.example.com/timeline.json"
const FIELDS = [
  { field: FieldName.DrugName, value: "hydromorphone" },
  { field: FieldName.Quantity, value: 30 },
]

type Call = { readonly url: string; readonly authorization: string | null }

function vendor(options: {
  sessions?: readonly { id: string; agent_id: string }[]
  listStatus?: number
  artifactsAfter?: number
  timelineBody?: unknown
}): { doFetch: WitnessFetch; calls: Call[] } {
  const calls: Call[] = []
  let sessionReads = 0
  const doFetch: WitnessFetch = async (url, init) => {
    const headers = (init.headers ?? {}) as Record<string, string>
    calls.push({ url, authorization: headers.Authorization ?? null })
    if (url.startsWith(`${VENDOR_SESSIONS_URL}?`)) {
      const sessions = options.sessions ?? [{ id: SESSION, agent_id: AGENT }]
      return Response.json({ sessions, has_more: false }, { status: options.listStatus ?? 200 })
    }
    if (url.startsWith(`${VENDOR_SESSIONS_URL}/`)) {
      sessionReads += 1
      const published = sessionReads > (options.artifactsAfter ?? 0)
      const artifacts = published
        ? sessionRecord.artifacts.map((artifact) =>
            artifact.type === "timeline" ? { ...artifact, url: TIMELINE_URL } : artifact,
          )
        : []
      return Response.json({ ...sessionRecord, agent_id: AGENT, artifacts })
    }
    if (url === TIMELINE_URL) {
      return Response.json(options.timelineBody ?? timeline)
    }
    return new Response(null, { status: 404 })
  }
  return { doFetch, calls }
}

function run(doFetch: WitnessFetch, slept: number[] = [], apiKey: string | null = "key") {
  return witnessOrder({
    apiKey,
    agentId: AGENT,
    fields: FIELDS,
    nowIso: "2026-09-25T19:00:00.000Z",
    doFetch,
    sleep: async (ms) => {
      slept.push(ms)
    },
    delaysMs: [0, 2000, 3000],
  })
}

describe("S2: finalize reads the vendor's timeline with the server's own key", () => {
  it("finds the session through this call's own agent and witnesses field by field", async () => {
    const { doFetch, calls } = vendor({})
    const witness = await run(doFetch)
    expect(witness.unavailableReason).toBeNull()
    expect(witness.vendorSessionIds).toEqual([SESSION])
    expect(witness.vendorUserTurnCount).toBe(1)
    expect(witness.fields.map((field) => field.verdict)).toEqual(["witnessed", "not_witnessed"])
    expect(calls[0]?.url).toContain(`agent_id=${AGENT}`)
    expect(calls[0]?.authorization).toBe("Bearer key")
    expect(calls.find((call) => call.url === TIMELINE_URL)?.authorization).toBeNull()
  })

  it("waits for the timeline, which the vendor publishes seconds after the session ends", async () => {
    const slept: number[] = []
    const witness = await run(vendor({ artifactsAfter: 2 }).doFetch, slept)
    expect(slept).toEqual([0, 2000, 3000])
    expect(witness.fields[0]?.verdict).toBe("witnessed")
  })

  it("is unavailable, with the reason, when the timeline never appears", async () => {
    const witness = await run(vendor({ artifactsAfter: 99 }).doFetch)
    expect(witness.unavailableReason).toContain("had not published the timeline")
    expect(witness.fields.every((field) => field.verdict === "unavailable")).toBe(true)
  })

  it("is unavailable when the vendor refuses the listing", async () => {
    const witness = await run(vendor({ listStatus: 500 }).doFetch)
    expect(witness.unavailableReason).toContain("answered 500")
    expect(witness.fields.map((field) => field.verdict)).toEqual(["unavailable", "unavailable"])
  })

  it("is unavailable when the vendor cannot be reached at all", async () => {
    const witness = await run(async () => {
      throw new TypeError("fetch failed")
    })
    expect(witness.unavailableReason).toBe("the vendor could not be read: fetch failed")
  })

  it("ignores sessions of another agent, even if the vendor's filter returned them", async () => {
    const witness = await run(
      vendor({ sessions: [{ id: "sess_other", agent_id: "agent_someone_else" }] }).doFetch,
    )
    expect(witness.unavailableReason).toBe(`the vendor lists no session for agent ${AGENT}`)
    expect(witness.vendorSessionIds).toEqual([])
  })

  it("is unavailable when the timeline does not parse", async () => {
    const witness = await run(vendor({ timelineBody: { turns: "not a list" } }).doFetch)
    expect(witness.unavailableReason).toContain("does not parse")
  })

  it("asks nobody without a key", async () => {
    const { doFetch, calls } = vendor({})
    const witness = await run(doFetch, [], null)
    expect(calls).toHaveLength(0)
    expect(witness.fields.every((field) => field.verdict === "unavailable")).toBe(true)
  })

  it("does not wait on the vendor when no field reached the order", async () => {
    const { doFetch, calls } = vendor({})
    const witness = await witnessOrder({
      apiKey: "key",
      agentId: AGENT,
      fields: [],
      nowIso: "2026-09-25T19:00:00.000Z",
      doFetch,
    })
    expect(calls).toHaveLength(0)
    expect(witness.fields).toEqual([])
    expect(witness.unavailableReason).toContain("nothing to witness")
  })
})
