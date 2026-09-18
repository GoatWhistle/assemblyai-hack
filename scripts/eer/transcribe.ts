import { readFileSync } from "node:fs"
import WebSocket from "ws"

const TARGET_RATE = 16000
const CHUNK_MS = 100

export type ManifestItem = {
  readonly file: string
  readonly spoken: string
  readonly carrier: string
  readonly voice: string
  readonly entityType: string
}

type TranscribedWord = {
  readonly text: string
  readonly start: number
  readonly end: number
  readonly confidence: number
}

export type TranscriptResult = {
  readonly item: ManifestItem
  readonly transcript: string
  readonly words: readonly TranscribedWord[]
  readonly closeCode: number
  readonly socketMs: number
  readonly audioSeconds: number
  readonly openMs: number
  readonly firstPartialMs: number | null
  readonly finalizationMs: number | null
  readonly turnCount: number
}

function readWav(path: string): { readonly rate: number; readonly samples: Int16Array } {
  const buffer = readFileSync(path)
  let offset = 12
  let rate = 0
  let dataStart = -1
  let dataLength = 0

  while (offset + 8 <= buffer.length) {
    const id = buffer.toString("ascii", offset, offset + 4)
    const size = buffer.readUInt32LE(offset + 4)
    if (id === "fmt ") {
      rate = buffer.readUInt32LE(offset + 12)
    }
    if (id === "data") {
      dataStart = offset + 8
      dataLength = size
      break
    }
    offset += 8 + size + (size % 2)
  }

  if (dataStart < 0 || rate === 0) {
    throw new Error(`${path}: no data or fmt chunk found`)
  }

  const count = Math.floor(dataLength / 2)
  const samples = new Int16Array(count)
  for (let i = 0; i < count; i += 1) {
    samples[i] = buffer.readInt16LE(dataStart + i * 2)
  }
  return { rate, samples }
}

function resampleLinear(samples: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate) {
    return samples
  }
  const ratio = fromRate / toRate
  const outLength = Math.floor(samples.length / ratio)
  const out = new Int16Array(outLength)
  for (let i = 0; i < outLength; i += 1) {
    const source = i * ratio
    const low = Math.floor(source)
    const high = Math.min(samples.length - 1, low + 1)
    const weight = source - low
    const value = (samples[low] ?? 0) * (1 - weight) + (samples[high] ?? 0) * weight
    out[i] = Math.max(-32768, Math.min(32767, Math.round(value)))
  }
  return out
}

async function mintToken(key: string): Promise<string> {
  const response = await fetch(
    "https://streaming.assemblyai.com/v3/token?expires_in_seconds=60",
    { headers: { Authorization: key } },
  )
  if (!response.ok) {
    throw new Error(`token mint failed with ${response.status}`)
  }
  const body = (await response.json()) as { token: string }
  return body.token
}

type TurnState = {
  transcript: string
  words: readonly TranscribedWord[]
  firstPartialMs: number | null
  finalizationMs: number | null
  turnCount: number
}

function applyTurn(
  state: TurnState,
  message: Record<string, unknown>,
  sinceOpenMs: number,
  sinceLastAudioMs: number | null,
): void {
  state.turnCount += 1
  if (state.firstPartialMs === null) {
    state.firstPartialMs = sinceOpenMs
  }
  if (
    message.end_of_turn === true &&
    state.finalizationMs === null &&
    sinceLastAudioMs !== null
  ) {
    state.finalizationMs = sinceLastAudioMs
  }
  const text = String(message.transcript ?? "")
  if (text.length > 0) {
    state.transcript = text
  }
  const incoming = message.words
  if (Array.isArray(incoming) && incoming.length > 0) {
    state.words = incoming as readonly TranscribedWord[]
  }
}

export async function transcribeItem(
  item: ManifestItem,
  key: string,
  keyterms: readonly string[],
): Promise<TranscriptResult> {
  const wav = readWav(item.file)
  const samples = resampleLinear(wav.samples, wav.rate, TARGET_RATE)
  const audioSeconds = samples.length / TARGET_RATE
  const token = await mintToken(key)

  const query = new URLSearchParams({
    token,
    sample_rate: String(TARGET_RATE),
    encoding: "pcm_s16le",
    format_turns: "true",
  })
  if (keyterms.length > 0) {
    query.set("keyterms_prompt", JSON.stringify(keyterms))
  }

  const socket = new WebSocket(`wss://streaming.assemblyai.com/v3/ws?${query.toString()}`)
  const openedAt = Date.now()

  return await new Promise<TranscriptResult>((resolve, reject) => {
    const state: TurnState = {
      transcript: "",
      words: [],
      firstPartialMs: null,
      finalizationMs: null,
      turnCount: 0,
    }
    let openMs = 0
    let lastAudioSentAt = 0

    socket.on("open", () => {
      openMs = Date.now() - openedAt
      const perChunk = (TARGET_RATE * CHUNK_MS) / 1000
      let sent = 0
      const timer = setInterval(() => {
        if (socket.readyState !== WebSocket.OPEN) {
          clearInterval(timer)
          return
        }
        const slice = samples.subarray(sent, sent + perChunk)
        if (slice.length === 0) {
          clearInterval(timer)
          socket.send(JSON.stringify({ type: "Terminate" }))
          return
        }
        socket.send(Buffer.from(slice.buffer, slice.byteOffset, slice.byteLength))
        lastAudioSentAt = Date.now()
        sent += perChunk
      }, CHUNK_MS)
    })

    socket.on("message", (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString("utf8")) as Record<string, unknown>
        if (message.type === "Error") {
          console.error(`    Error frame on ${item.spoken}: ${JSON.stringify(message)}`)
          return
        }
        if (message.type !== "Turn") {
          return
        }
        applyTurn(
          state,
          message,
          Date.now() - openedAt,
          lastAudioSentAt > 0 ? Date.now() - lastAudioSentAt : null,
        )
      } catch {
        return
      }
    })

    socket.on("close", (code: number, reason: Buffer) => {
      if (code !== 1000) {
        console.error(
          `    close ${code} on ${item.spoken}: ${reason.toString("utf8") || "(no reason given)"}`,
        )
      }
      resolve({
        item,
        transcript: state.transcript,
        words: state.words,
        closeCode: code,
        socketMs: Date.now() - openedAt,
        audioSeconds,
        openMs,
        firstPartialMs: state.firstPartialMs,
        finalizationMs: state.finalizationMs,
        turnCount: state.turnCount,
      })
    })

    socket.on("error", reject)
  })
}
