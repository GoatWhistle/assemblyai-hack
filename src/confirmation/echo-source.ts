export const ECHO_MATCH_THRESHOLD = 0.6

const ECHO_MIN_SHARED_TOKENS = 3

function spelledLetter(token: string): boolean {
  return /^[a-z]$/.test(token) && token !== "i"
}

function normalize(text: string): readonly string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 0 && !spelledLetter(token))
}

function overlap(candidate: string, reference: string): { score: number; shared: number } {
  const candidateTokens = normalize(candidate)
  const referenceTokens = new Set(normalize(reference))
  if (candidateTokens.length === 0 || referenceTokens.size === 0) {
    return { score: 0, shared: 0 }
  }
  let shared = 0
  for (const token of candidateTokens) {
    if (referenceTokens.has(token)) {
      shared += 1
    }
  }
  return { score: shared / candidateTokens.length, shared }
}

export function utteranceOverlap(candidate: string, reference: string): number {
  return overlap(candidate, reference).score
}

export function isEchoOf(candidate: string, reference: string): boolean {
  const { score, shared } = overlap(candidate, reference)
  return score >= ECHO_MATCH_THRESHOLD && shared >= ECHO_MIN_SHARED_TOKENS
}

export type EchoSourceVerdict = {
  readonly matchesAgent: boolean
  readonly overlap: number
  readonly matchedAgainst: string | null
}

export function matchesServerRecordedAgentLine(input: {
  transcript: string
  agentLine: string | null
  threshold?: number
  minSharedTokens?: number
}): EchoSourceVerdict {
  if (input.agentLine === null) {
    return { matchesAgent: false, overlap: 0, matchedAgainst: null }
  }
  const threshold = input.threshold ?? ECHO_MATCH_THRESHOLD
  const minSharedTokens = input.minSharedTokens ?? ECHO_MIN_SHARED_TOKENS
  const { score, shared } = overlap(input.transcript, input.agentLine)
  const matchesAgent = score >= threshold && shared >= minSharedTokens
  return { matchesAgent, overlap: score, matchedAgainst: input.agentLine }
}
