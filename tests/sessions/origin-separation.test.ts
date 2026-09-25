import { GET as metricsRoute } from "@app/api/metrics/route"
import { afterEach, describe, expect, it } from "vitest"
import { FieldName, GateAction, ReasonCode } from "@/domain"
import type { StoredSession } from "@/sessions"
import {
  ALL_SESSION_ORIGINS,
  countsTowardPublishedMetrics,
  createBlobStore,
  createMemoryStore,
  installSessionStore,
  originFromEnv,
  SESSION_ORIGIN_SEPARATION_NOTE,
  SessionOrigin,
  sessionOriginOf,
  storagePrefixFor,
} from "@/sessions"

function session(sessionId: string, origin: SessionOrigin): StoredSession {
  return {
    sessionId,
    startedAt: "2026-09-17T00:00:00.000Z",
    endedAt: "2026-09-17T00:01:00.000Z",
    decisions: [],
    events: [],
    closes: [],
    gateEnabled: true,
    origin,
    orderId: null,
    committed: false,
  }
}

function recordingBlobClient(): {
  paths: string[]
  prefixes: string[]
  client: Parameters<typeof createBlobStore>[1]
} {
  const paths: string[] = []
  const prefixes: string[] = []
  return {
    paths,
    prefixes,
    client: {
      put: async (path) => {
        paths.push(path)
        return { url: `https://blob.example.com/${path}` }
      },
      list: async ({ prefix }) => {
        prefixes.push(prefix)
        return { blobs: [] }
      },
    },
  }
}

describe("a demo rehearsal and a measured session never share storage", () => {
  it("gives every origin a distinct blob prefix, which is what keeps the two sets apart on disk", () => {
    const prefixes = ALL_SESSION_ORIGINS.map(storagePrefixFor)
    expect(
      new Set(prefixes).size,
      "two origins sharing one prefix would put rehearsals and measured runs back in the same bucket, which is the whole defect this task names",
    ).toBe(ALL_SESSION_ORIGINS.length)
  })

  it("writes a rehearsal and a measurement to different blob paths for the same session id", async () => {
    const rehearsal = recordingBlobClient()
    await createBlobStore("token", rehearsal.client).put(
      session("s1", SessionOrigin.DemoRehearsal),
    )
    const measured = recordingBlobClient()
    await createBlobStore("token", measured.client).put(
      session("s1", SessionOrigin.Measurement),
    )

    expect(
      rehearsal.paths[0],
      "an identical session id must not collide across origins, or a rehearsal overwrites the measurement it was rehearsing",
    ).not.toBe(measured.paths[0])
    expect(rehearsal.paths[0]).toContain("rehearsal")
    expect(measured.paths[0]).toContain("measurement")
  })

  it("lists only the requested origin, so a rehearsal cannot be counted into a published figure", async () => {
    const store = createMemoryStore()
    await store.put(session("live-1", SessionOrigin.Live))
    await store.put(session("rehearsal-1", SessionOrigin.DemoRehearsal))
    await store.put(session("measured-1", SessionOrigin.Measurement))

    const measured = await store.list(SessionOrigin.Measurement)
    expect(
      measured.map((s) => s.sessionId),
      "a reader asking for measured sessions that received a rehearsal would publish a number produced by a scripted demo",
    ).toEqual(["measured-1"])

    const rehearsals = await store.list(SessionOrigin.DemoRehearsal)
    expect(rehearsals.map((s) => s.sessionId)).toEqual(["rehearsal-1"])
  })

  it("still lists everything when no origin is named, so the separation does not hide sessions from an operator", async () => {
    const store = createMemoryStore()
    await store.put(session("live-1", SessionOrigin.Live))
    await store.put(session("rehearsal-1", SessionOrigin.DemoRehearsal))
    expect(
      (await store.list()).length,
      "an unfiltered list must remain complete; a filter that silently applied itself would make sessions look lost",
    ).toBe(2)
  })

  it("narrows the blob listing by prefix rather than fetching every session and filtering after", async () => {
    const recording = recordingBlobClient()
    await createBlobStore("token", recording.client).list(SessionOrigin.Measurement)
    expect(
      recording.prefixes[0],
      "filtering after a full fetch would still read every rehearsal blob, and on Vercel Blob that is paid egress for data we are discarding",
    ).toBe("sessions/measurement/")
  })

  it("counts only measured sessions toward a published figure, and says so as an exported rule rather than a convention", () => {
    expect(
      countsTowardPublishedMetrics(SessionOrigin.Measurement),
      "measured runs are the only ones a published number may rest on",
    ).toBe(true)
    expect(
      countsTowardPublishedMetrics(SessionOrigin.DemoRehearsal),
      "a rehearsal is scripted, so including it would be reporting a result we arranged",
    ).toBe(false)
    expect(
      countsTowardPublishedMetrics(SessionOrigin.Live),
      "a live judge session is not a controlled measurement either, so it cannot feed a published rate",
    ).toBe(false)
  })

  it("treats an unknown or absent origin as live rather than as measured, so a missing field cannot inflate a published set", () => {
    expect(
      sessionOriginOf(undefined),
      "an absent origin defaulting to measurement would let an unlabelled session enter a published figure, which is absence reading as success",
    ).toBe(SessionOrigin.Live)
    expect(sessionOriginOf("nonsense")).toBe(SessionOrigin.Live)
    expect(originFromEnv({})).toBe(SessionOrigin.Live)
    expect(originFromEnv({ READBACK_SESSION_ORIGIN: "measurement" })).toBe(
      SessionOrigin.Measurement,
    )
  })

  it("states the separation rule in exported prose, so the reason survives the ban on comments", () => {
    expect(SESSION_ORIGIN_SEPARATION_NOTE).toMatch(/different prefixes/)
    expect(SESSION_ORIGIN_SEPARATION_NOTE).toMatch(/rehearsal/)
  })
})

describe("W2: published metrics read only measured sessions", () => {
  afterEach(() => {
    installSessionStore(null)
  })

  it("counts a measurement and leaves out a live session and a demo rehearsal", async () => {
    const store = createMemoryStore()
    installSessionStore(store)
    const decided = (sessionId: string, origin: SessionOrigin): StoredSession => ({
      ...session(sessionId, origin),
      decisions: [
        {
          action: GateAction.Accept,
          reasonCode: ReasonCode.ValidatorPassedHighConf,
          field: FieldName.Quantity,
          candidateId: `${sessionId}-c1`,
          agentUtterance: "",
          evidence: {},
          confirmationMode: null,
        },
      ],
    })
    await store.put(decided("measured", SessionOrigin.Measurement))
    await store.put(decided("rehearsal", SessionOrigin.DemoRehearsal))
    await store.put(decided("live", SessionOrigin.Live))
    const body = await (await metricsRoute()).json()
    expect(body.sessionCount).toBe(1)
    expect(body.decisionCount).toBe(1)
    expect(body.publishedOrigins).toEqual([SessionOrigin.Measurement])
    expect(body.originNote).toBe(SESSION_ORIGIN_SEPARATION_NOTE)
  })
})
