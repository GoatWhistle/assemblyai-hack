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

const ECHO_MAX_SKIP = 1

const ECHO_MIN_CHAIN_WITH_SKIPS = 6

type Overlap = { score: number; shared: number }

function longestRun(candidate: readonly string[], reference: readonly string[]): number {
  let best = 0
  let previous: number[] = new Array(reference.length + 1).fill(0)
  for (let i = 1; i <= candidate.length; i += 1) {
    const current: number[] = new Array(reference.length + 1).fill(0)
    for (let j = 1; j <= reference.length; j += 1) {
      if (candidate[i - 1] === reference[j - 1]) {
        current[j] = (previous[j - 1] ?? 0) + 1
        best = Math.max(best, current[j] ?? 0)
      }
    }
    previous = current
  }
  return best
}

function chainBefore(chain: readonly number[][], i: number, j: number): number {
  let before = 0
  for (let pi = Math.max(0, i - 1 - ECHO_MAX_SKIP); pi < i; pi += 1) {
    for (let pj = Math.max(0, j - 1 - ECHO_MAX_SKIP); pj < j; pj += 1) {
      before = Math.max(before, chain[pi]?.[pj] ?? 0)
    }
  }
  return before
}

function longestChain(candidate: readonly string[], reference: readonly string[]): number {
  const chain: number[][] = candidate.map(() => new Array(reference.length).fill(0))
  let best = 0
  candidate.forEach((token, i) => {
    reference.forEach((other, j) => {
      const row = chain[i]
      if (token !== other || row === undefined) {
        return
      }
      row[j] = chainBefore(chain, i, j) + 1
      best = Math.max(best, row[j] ?? 0)
    })
  })
  return best
}

function overlap(candidate: string, reference: string): Overlap {
  const candidateTokens = normalize(candidate)
  const referenceTokens = normalize(reference)
  if (candidateTokens.length === 0 || referenceTokens.length === 0) {
    return { score: 0, shared: 0 }
  }
  const run = longestRun(candidateTokens, referenceTokens)
  const chain = longestChain(candidateTokens, referenceTokens)
  const shared = chain >= ECHO_MIN_CHAIN_WITH_SKIPS ? chain : run
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
