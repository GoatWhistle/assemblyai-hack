#!/usr/bin/env -S npx tsx

import { writeFileSync } from "node:fs"
import WebSocket from "ws"
import { ratePerHourFor } from "@/domain"
import { readWav, resampleLinear } from "../eer/wav"
import { appendPaidRun, paidRunOf } from "./record-spend"

const TOKEN_URL = "https://agents.assemblyai.com/v1/token"
const SOCKET_URL = "wss://agents.assemblyai.com/v1/ws"
const SESSIONS_URL = "https://agents.assemblyai.com/v1/sessions"
const RATE = 24000
const CHUNK_MS = 50
const CHUNK_SAMPLES = (RATE * CHUNK_MS) / 1000
const HARD_LIMIT_MS = 90000
const POLL_OFFSETS_S = [0, 2, 5, 10, 20, 40, 60]

type Probe = {
  readonly sessionId: string | null
  readonly openedAtMs: number
  readonly endedAtMs: number
  readonly userTranscripts: readonly string[]
  readonly eventTypes: readonly string[]
}

function argValue(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  return (index >= 0 ? process.argv[index + 1] : undefined) ?? fallback
}

async function mintToken(key: string): Promise<string> {
  const url = `${TOKEN_URL}?expires_in_seconds=60&max_session_duration_seconds=120`
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } })
  if (!response.ok) {
    throw new Error(`agent token mint failed: ${response.status}`)
  }
  return ((await response.json()) as { token: string }).token
}

function chunkOf(samples: Int16Array, offset: number): string {
  const slice = new Int16Array(CHUNK_SAMPLES)
  slice.set(samples.subarray(offset, offset + CHUNK_SAMPLES))
  return Buffer.from(slice.buffer).toString("base64")
}

type Live = {
  sessionId: string | null
  speechOffset: number
  ending: boolean
  readonly userTranscripts: string[]
  readonly eventTypes: string[]
}

type AgentFrame = { type: string; session_id?: string; text?: string; error?: unknown }

function onFrame(live: Live, frame: AgentFrame, end: () => void, finish: () => void): void {
  if (!frame.type.startsWith("reply.audio") && !frame.type.endsWith(".delta")) {
    live.eventTypes.push(frame.type)
  }
  switch (frame.type) {
    case "session.ready":
      live.sessionId = frame.session_id ?? null
      break
    case "reply.done":
      if (live.speechOffset < 0) {
        live.speechOffset = 0
      } else if (live.userTranscripts.length > 0) {
        end()
      }
      break
    case "transcript.user":
      live.userTranscripts.push(frame.text ?? "")
      break
    case "error":
      console.error(`agent error frame: ${JSON.stringify(frame.error)}`)
      break
    case "session.ended":
      finish()
      break
    default:
      break
  }
}

function nextChunk(live: Live, speech: Int16Array): string {
  const offset = live.speechOffset
  if (offset < 0) {
    return chunkOf(new Int16Array(0), 0)
  }
  live.speechOffset += CHUNK_SAMPLES
  return offset < speech.length ? chunkOf(speech, offset) : chunkOf(new Int16Array(0), 0)
}

const PROBE_SESSION = {
  system_prompt:
    "You are a test line. When the caller names a drug, repeat the drug name once and say nothing else.",
  greeting: "Witness probe. Say a drug name.",
  input: { format: { encoding: "audio/pcm" } },
}

function runSession(token: string, speech: Int16Array): Promise<Probe> {
  return new Promise((resolve) => {
    const openedAtMs = Date.now()
    const socket = new WebSocket(`${SOCKET_URL}?token=${encodeURIComponent(token)}`)
    const live: Live = {
      sessionId: null,
      speechOffset: -1,
      ending: false,
      userTranscripts: [],
      eventTypes: [],
    }
    let settled = false
    const finish = (): void => {
      if (settled) {
        return
      }
      settled = true
      clearInterval(pump)
      clearTimeout(limit)
      socket.close(1000, "probe done")
      const { sessionId, userTranscripts, eventTypes } = live
      resolve({ sessionId, openedAtMs, endedAtMs: Date.now(), userTranscripts, eventTypes })
    }
    const end = (): void => {
      if (!live.ending && socket.readyState === WebSocket.OPEN) {
        live.ending = true
        socket.send(JSON.stringify({ type: "session.end" }))
      }
    }
    const pump = setInterval(() => {
      if (socket.readyState === WebSocket.OPEN && live.sessionId !== null && !live.ending) {
        socket.send(JSON.stringify({ type: "input.audio", audio: nextChunk(live, speech) }))
      }
    }, CHUNK_MS)
    const limit = setTimeout(() => {
      end()
      setTimeout(finish, 5000)
    }, HARD_LIMIT_MS)
    socket.on("open", () => {
      socket.send(JSON.stringify({ type: "session.update", session: PROBE_SESSION }))
    })
    socket.on("message", (data) => {
      onFrame(live, JSON.parse(String(data)) as AgentFrame, end, finish)
    })
    socket.on("close", (code) => {
      live.eventTypes.push(`close ${code}`)
      finish()
    })
  })
}

async function getJson(url: string, key?: string): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, {
    headers: key === undefined ? {} : { Authorization: `Bearer ${key}` },
  })
  const text = await response.text()
  let body: unknown = text
  try {
    body = JSON.parse(text)
  } catch {
    body = text.slice(0, 200)
  }
  return { status: response.status, body }
}

async function pollWitness(key: string, sessionId: string, endedAtMs: number, out: string) {
  for (const offset of POLL_OFFSETS_S) {
    const due = endedAtMs + offset * 1000
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, due - Date.now())))
    const since = ((Date.now() - endedAtMs) / 1000).toFixed(1)
    const session = await getJson(`${SESSIONS_URL}/${sessionId}`, key)
    const record = session.body as {
      status?: string
      artifacts?: { type: string; url: string }[]
    }
    const types = (record.artifacts ?? []).map((artifact) => artifact.type)
    console.log(
      `+${since}s GET /v1/sessions/{id}: ${session.status}, status ${record.status ?? "-"}, artifacts [${types.join(", ")}]`,
    )
    const timelineUrl = record.artifacts?.find((artifact) => artifact.type === "timeline")?.url
    if (timelineUrl === undefined) {
      continue
    }
    const timeline = await getJson(timelineUrl)
    const turns = (timeline.body as { turns?: { user_transcript?: string | null }[] }).turns
    const withUser = (turns ?? []).filter((turn) => (turn.user_transcript ?? "").length > 0)
    console.log(
      `+${since}s timeline artifact: ${timeline.status}, ${turns?.length ?? 0} turns, ${withUser.length} with user_transcript`,
    )
    if (timeline.status === 200 && withUser.length > 0) {
      writeFileSync(out, `${JSON.stringify(timeline.body, null, 2)}\n`, "utf8")
      console.log(`timeline written to ${out}`)
      return
    }
  }
  console.log("no timeline with a user transcript within the polling window")
}

async function main(): Promise<void> {
  const key = process.env.ASSEMBLYAI_API_KEY?.trim() ?? ""
  if (key.length === 0) {
    console.error("ASSEMBLYAI_API_KEY is not set")
    process.exit(1)
  }
  const wav = argValue("--wav", "tests/live/lines/name-hydromorphone.wav")
  const out = argValue("--out", "eval/fixtures/witness/timeline-recorded-shape.json")
  const source = readWav(wav)
  const speech = resampleLinear(source.samples, source.rate, RATE)
  console.log(
    `opening a real agent socket at USD ${ratePerHourFor(["agent"])}/h; speech ${wav}, ${(speech.length / RATE).toFixed(1)} s`,
  )
  const probe = await runSession(await mintToken(key), speech)
  const failed = probe.sessionId === null || probe.userTranscripts.length === 0
  const run = paidRunOf({
    command: "scripts/report/probe-witness.ts",
    sockets: ["agent"],
    openedAtMs: probe.openedAtMs,
    closedAtMs: probe.endedAtMs,
    outcome: failed ? "failed" : "completed",
  })
  appendPaidRun(run)
  console.log(`spend recorded: ${run.openSeconds} s of agent socket time`)
  console.log(`events: ${probe.eventTypes.join(", ")}`)
  console.log(`transcript.user on the socket: ${JSON.stringify(probe.userTranscripts)}`)
  if (probe.sessionId === null) {
    console.log("no session.ready, so there is no vendor session to read back")
    return
  }
  console.log(`vendor session ${probe.sessionId}`)
  await pollWitness(key, probe.sessionId, probe.endedAtMs, out)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
