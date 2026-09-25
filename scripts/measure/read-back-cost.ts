import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { FIELD_POLICIES, FieldName } from "../../src/domain"
import { contrastiveUtterance, readBackUtterance } from "../../src/gate"
import { lasaRiskFor } from "../../src/lasa"

const RATE_SET = "eval/control/result-plain.json"

type TimedWord = { readonly start: number; readonly end: number }
type RateFile = { readonly results: readonly { readonly words: readonly TimedWord[] }[] }

export type SpeakingRate = {
  readonly words: number
  readonly seconds: number
  readonly perSecond: number
}

function speakingRate(path = RATE_SET): SpeakingRate {
  const file = JSON.parse(readFileSync(resolve(path), "utf8")) as RateFile
  let words = 0
  let milliseconds = 0
  for (const result of file.results) {
    const first = result.words[0]
    const last = result.words.at(-1)
    if (first === undefined || last === undefined) {
      continue
    }
    words += result.words.length
    milliseconds += last.end - first.start
  }
  const seconds = milliseconds / 1000
  return { words, seconds, perSecond: seconds === 0 ? 0 : words / seconds }
}

function spokenWords(sentence: string): number {
  return sentence
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word)).length
}

function standingReadBackFields(): readonly FieldName[] {
  return [...FIELD_POLICIES.values()].filter((p) => p.readBackAlways).map((p) => p.field)
}

function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length
}

function plainReadBackWords(values: readonly string[]): number {
  return mean(values.map((value) => spokenWords(readBackUtterance(FieldName.DrugName, value))))
}

function contrastiveReadBackWords(values: readonly string[]): readonly number[] {
  return values.flatMap((value) => {
    const risk = lasaRiskFor(value)
    return risk.hit
      ? [spokenWords(contrastiveUtterance(String(risk.matchedTerm), [...risk.confusableWith]))]
      : []
  })
}

export function printReadBackCost(correctValues: readonly string[]): void {
  const rate = speakingRate()
  const fields = standingReadBackFields()
  const plain = plainReadBackWords(correctValues)
  const asked = contrastiveReadBackWords(correctValues)
  const contrastive = mean(asked)
  const seconds = (words: number): string =>
    rate.perSecond === 0 ? "n/a" : `${(words / rate.perSecond).toFixed(1)} s`
  console.log(
    `fields read back by regulation (readBackAlways): ${fields.length} of ${FIELD_POLICIES.size}: ${fields.join(", ")}`,
  )
  console.log(
    `speaking rate for the seconds below: ${rate.perSecond.toFixed(2)} words/s, ${rate.words} words over ${rate.seconds.toFixed(1)} s of the desktop synthesiser as the recognizer timed it in ${RATE_SET}; the agent's own voice has not been timed`,
  )
  console.log(
    `plain drug-name read-back: ${plain.toFixed(1)} words on average over the ${correctValues.length} correct values, about ${seconds(plain)}`,
  )
  console.log(
    asked.length === 0
      ? "contrastive read-back: no correct value in this corpus is on the list"
      : `contrastive read-back of a listed value, with every published partner named: ${contrastive.toFixed(1)} words on average over the ${asked.length} correct values the list asks about, about ${seconds(contrastive)}, or ${seconds(contrastive - plain)} more than a plain read-back`,
  )
  console.log(
    "each spelled letter of a cue counts as one word, so the contrastive figure is an overestimate for the letters",
  )
}
