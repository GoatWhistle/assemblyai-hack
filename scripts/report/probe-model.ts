const PROBE_SAMPLE_RATE = 16000

export const PROBE_CANDIDATE_MODEL = "universal-3-6-pro"

export type ModelVerdict = "accepted" | "rejected" | "substituted" | "inconclusive"

export function probeSocketUrl(token: string, model: string | null): string {
  const url = new URL("wss://streaming.assemblyai.com/v3/ws")
  url.searchParams.set("token", token)
  url.searchParams.set("sample_rate", String(PROBE_SAMPLE_RATE))
  url.searchParams.set("encoding", "pcm_s16le")
  url.searchParams.set("format_turns", "true")
  if (model !== null) {
    url.searchParams.set("speech_model", model)
  }
  return url.toString()
}

export function modelFromArgs(argv: readonly string[]): string | null {
  const index = argv.indexOf("--model")
  if (index < 0) {
    return null
  }
  const value = argv[index + 1]
  return value === undefined || value.startsWith("--") ? null : value
}

export function modelVerdict(input: {
  requested: string | null
  reported: string | null
  sawBegin: boolean
  closeCode: number | null
}): ModelVerdict {
  if (input.requested === null) {
    return "inconclusive"
  }
  if (!input.sawBegin) {
    return input.closeCode !== null && input.closeCode !== 1000 ? "rejected" : "inconclusive"
  }
  if (input.reported === null) {
    return "inconclusive"
  }
  return input.reported === input.requested ? "accepted" : "substituted"
}
