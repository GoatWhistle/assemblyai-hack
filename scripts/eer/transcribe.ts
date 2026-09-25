import { type ConnectDeps, connectStreaming, DEFAULT_CONNECT_DEPS } from "./connect"
import { readWav, resampleLinear } from "./wav"

const TARGET_RATE = 16000
const CHUNK_MS = 100
const SOCKET_OPEN = 1

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
  deps: ConnectDeps = DEFAULT_CONNECT_DEPS,
): Promise<TranscriptResult> {
  const wav = readWav(item.file)
  const samples = resampleLinear(wav.samples, wav.rate, TARGET_RATE)
  const audioSeconds = samples.length / TARGET_RATE

  const query = new URLSearchParams({
    sample_rate: String(TARGET_RATE),
    encoding: "pcm_s16le",
    format_turns: "true",
  })
  if (keyterms.length > 0) {
    query.set("keyterms_prompt", JSON.stringify(keyterms))
  }

  const { socket, openedAt, openMs } = await connectStreaming(item.spoken, key, query, deps)

  return await new Promise<TranscriptResult>((resolve, reject) => {
    const state: TurnState = {
      transcript: "",
      words: [],
      firstPartialMs: null,
      finalizationMs: null,
      turnCount: 0,
    }
    let lastAudioSentAt = 0

    const perChunk = (TARGET_RATE * CHUNK_MS) / 1000
    let sent = 0
    const timer = setInterval(() => {
      if (socket.readyState !== SOCKET_OPEN) {
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
      clearInterval(timer)
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

    socket.on("error", (error: Error) => {
      clearInterval(timer)
      reject(error)
    })
  })
}
