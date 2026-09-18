#!/usr/bin/env -S npx tsx

import WebSocket from "ws"
import { ratePerHourFor } from "@/domain"
import { appendPaidRun, paidRunOf } from "./record-spend"

const SAMPLE_RATE = 16000
const CHUNK_MS = 100
const SAMPLES_PER_CHUNK = (SAMPLE_RATE * CHUNK_MS) / 1000

function silence(): Buffer {
  return Buffer.alloc(SAMPLES_PER_CHUNK * 2)
}

async function mintToken(key: string): Promise<string> {
  const url = "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60"
  const response = await fetch(url, { headers: { Authorization: key } })
  if (!response.ok) {
    throw new Error(`token mint failed: ${response.status}`)
  }
  const body = (await response.json()) as { token: string }
  return body.token
}

async function main(): Promise<void> {
  const key = process.env.ASSEMBLYAI_API_KEY
  if (key === undefined || key.length === 0) {
    console.error("ASSEMBLYAI_API_KEY is not set")
    process.exit(1)
  }

  const seconds = Number(process.argv[2] ?? 6)
  console.log(`opening a real STT socket, sending ${seconds}s of silence`)
  const ratePerHour = ratePerHourFor(["stt"])
  console.log(
    `billed as ${seconds}s of streaming at $${ratePerHour.toFixed(2)}/hr = $${((seconds / 3600) * ratePerHour).toFixed(4)}`,
  )

  const token = await mintToken(key)
  const socket = new WebSocket(
    `wss://streaming.assemblyai.com/v3/ws?token=${token}&sample_rate=${SAMPLE_RATE}&encoding=pcm_s16le&format_turns=true`,
  )

  const openedAt = Date.now()
  let sessionId = ""
  let framesSent = 0
  const events: string[] = []

  socket.on("open", () => {
    console.log(`socket open after ${Date.now() - openedAt} ms`)
    const timer = setInterval(() => {
      if (socket.readyState !== WebSocket.OPEN) {
        clearInterval(timer)
        return
      }
      socket.send(silence())
      framesSent += 1
      if (framesSent * CHUNK_MS >= seconds * 1000) {
        clearInterval(timer)
        socket.send(JSON.stringify({ type: "Terminate" }))
      }
    }, CHUNK_MS)
  })

  socket.on("message", (data: Buffer) => {
    const text = data.toString("utf8")
    try {
      const message = JSON.parse(text) as Record<string, unknown>
      const type = String(message.type ?? "unknown")
      events.push(type)
      if (type === "Begin") {
        sessionId = String(message.id ?? "")
        console.log(
          `Begin: session ${sessionId}, expires_at ${String(message.expires_at ?? "")}`,
        )
      }
      if (type === "Termination") {
        console.log(
          `Termination: audio_duration_seconds=${String(message.audio_duration_seconds ?? "")}, session_duration_seconds=${String(message.session_duration_seconds ?? "")}`,
        )
      }
    } catch {
      events.push("binary")
    }
  })

  socket.on("close", (code: number, reason: Buffer) => {
    const lifetime = Date.now() - openedAt
    console.log("")
    console.log(
      `close code ${code}${reason.length > 0 ? ` reason "${reason.toString("utf8")}"` : ""}`,
    )
    console.log(`socket lifetime ${lifetime} ms, frames sent ${framesSent}`)
    console.log(`message types seen: ${[...new Set(events)].join(", ")}`)
    console.log(
      `billed lifetime cost about $${((lifetime / 3600000) * ratePerHour).toFixed(4)}`,
    )
    appendPaidRun(
      paidRunOf({
        command: "scripts/report/probe-stt.ts",
        sockets: ["stt"],
        openedAtMs: openedAt,
        closedAtMs: Date.now(),
        outcome: code === 1000 ? "completed" : "failed",
      }),
    )
    console.log(`recorded in the spend ledger; run: npx tsx scripts/report/spend-report.ts`)
    process.exit(code === 1000 ? 0 : 1)
  })

  socket.on("error", (error: Error) => {
    console.error(`socket error: ${error.message}`)
    process.exit(1)
  })
}

if (process.argv[1]?.includes("probe-stt")) {
  void main()
}
