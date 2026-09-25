import { classifyCallerReply, spokenValueTokens } from "@/confirmation"
import { lasaRiskFor } from "@/lasa"

export const VOICE_SET_DOC = "docs/voice-set.md"

const LIVE_AUDIO_DIR = "eval/live/audio"

export const READ_BACK_VALUE = "hydromorphone 2 mg"

export type LiveKind = "lasa" | "safe" | "npi" | "dea" | "readback-answer" | "non-command"

export type LiveSetItem = {
  readonly id: string
  readonly speaker: string
  readonly line: string
  readonly file: string
  readonly text: string
  readonly kind: LiveKind
  readonly expectedDrug: string | null
  readonly lasaPartners: readonly string[]
  readonly expectedIdentifier: string | null
  readonly expectedAnswer: "confirmed" | "rejected" | "unclear" | null
}

const SHARED_KINDS: Readonly<Record<string, LiveKind>> = Object.freeze({
  "safe drug": "safe",
  npi: "npi",
  dea: "dea",
  "read-back answer": "readback-answer",
  "non-command": "non-command",
})

function cells(row: string): readonly string[] {
  return row
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim())
}

export function spokenIdentifier(text: string): string {
  return spokenValueTokens(text.replace(/^(my\s+)?(npi|dea)(\s+number)?(\s+is)?/i, ""))
    .filter((token) => /^\d+$/.test(token) || /^[a-z]$/.test(token))
    .map((token) => token.toUpperCase())
    .join("")
}

function drugOf(text: string): string {
  return (text.split(/[\s,]+/)[0] ?? "").toLowerCase()
}

export function itemFor(
  speaker: string,
  line: string,
  kind: LiveKind,
  text: string,
): LiveSetItem {
  const drug = kind === "lasa" || kind === "safe" ? drugOf(text) : null
  const answer =
    kind === "readback-answer" || kind === "non-command"
      ? classifyCallerReply({ text, valueText: READ_BACK_VALUE }).verdict
      : null
  return {
    id: `${speaker}-${line}`,
    speaker,
    line,
    file: `${LIVE_AUDIO_DIR}/${speaker}-${line}.wav`,
    text,
    kind,
    expectedDrug: drug,
    lasaPartners: drug === null ? [] : [...lasaRiskFor(drug).confusableWith],
    expectedIdentifier: kind === "npi" || kind === "dea" ? spokenIdentifier(text) : null,
    expectedAnswer: answer,
  }
}

export function parseVoiceSet(markdown: string): readonly LiveSetItem[] {
  const items: LiveSetItem[] = []
  const shared: { line: string; kind: LiveKind; text: string }[] = []
  const speakers: string[] = []
  let speaker: string | null = null
  let inShared = false
  for (const row of markdown.split(/\r?\n/)) {
    const heading = row.match(/^###\s+Speaker\s+(s\d)\b/i)
    if (heading !== null) {
      speaker = String(heading[1]).toLowerCase()
      speakers.push(speaker)
      inShared = false
      continue
    }
    if (/^###\s+Every speaker/i.test(row)) {
      speaker = null
      inShared = true
      continue
    }
    if (/^#{1,3}\s/.test(row)) {
      speaker = null
      inShared = false
      continue
    }
    const columns = cells(row)
    if (!row.startsWith("|") || !/^\d{2}$/.test(columns[0] ?? "")) {
      continue
    }
    const line = String(columns[0])
    if (speaker !== null && columns.length === 2) {
      const text = String(columns[1])
      const kind: LiveKind = lasaRiskFor(drugOf(text)).hit ? "lasa" : "safe"
      items.push(itemFor(speaker, line, kind, text))
    }
    if (inShared && columns.length === 3) {
      const kind = SHARED_KINDS[String(columns[1]).toLowerCase()]
      if (kind !== undefined) {
        shared.push({ line, kind, text: String(columns[2]) })
      }
    }
  }
  for (const who of speakers) {
    for (const entry of shared) {
      items.push(itemFor(who, entry.line, entry.kind, entry.text))
    }
  }
  return items
}
