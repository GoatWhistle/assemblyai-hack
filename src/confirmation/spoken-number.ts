const THOUSANDS_SEPARATOR = /(\d),(\d{3})(?!\d)/

export function collapseThousandsSeparators(text: string): string {
  let current = text
  for (;;) {
    const next = current.replace(THOUSANDS_SEPARATOR, "$1$2")
    if (next === current) {
      return current
    }
    current = next
  }
}

const SCALES: Readonly<Record<string, number>> = Object.freeze({
  hundred: 100,
  thousand: 1000,
})

const isNumber = (token: string | undefined): token is string =>
  token !== undefined && /^\d+$/.test(token)

function applyScales(tokens: readonly string[]): string[] {
  const out: string[] = []
  for (const token of tokens) {
    const scale = SCALES[token]
    if (scale === undefined) {
      out.push(token)
      continue
    }
    const previous = out[out.length - 1]
    if (isNumber(previous) && Number(previous) < scale) {
      out[out.length - 1] = String(Number(previous) * scale)
      continue
    }
    if (isNumber(previous) && scale === 1000 && Number(previous) % 1000 !== 0) {
      out[out.length - 1] = String(Number(previous) * scale)
      continue
    }
    out.push(String(scale))
  }
  return out
}

function joinsAdditively(head: number, tail: number): boolean {
  const thousands = head >= 1000 && head % 1000 === 0 && tail > 0 && tail < 1000
  const hundreds =
    head >= 100 && head % 100 === 0 && head % 1000 !== 0 && tail > 0 && tail < 100
  const tens = head >= 20 && head < 100 && head % 10 === 0 && tail > 0 && tail < 10
  return thousands || hundreds || tens
}

export function composeSpokenNumbers(tokens: readonly string[]): readonly string[] {
  const out: string[] = []
  for (const token of applyScales(tokens)) {
    const previous = out[out.length - 1]
    if (
      isNumber(token) &&
      isNumber(previous) &&
      joinsAdditively(Number(previous), Number(token))
    ) {
      out[out.length - 1] = String(Number(previous) + Number(token))
      continue
    }
    out.push(token)
  }
  return out
}

export function isScaleWord(token: string): boolean {
  return SCALES[token] !== undefined
}
