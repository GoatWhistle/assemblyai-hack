import {
  buildKeyterms,
  KEYTERMS_MAX,
  LASA_PAIRS,
  lasaCheckedTerms,
  normalizeTerm,
} from "@/lasa"

export type KeytermsArmId = "shipped" | "biased"

export type KeytermsArm = {
  readonly id: KeytermsArmId
  readonly title: string
  readonly listLabel: string
  readonly sample: readonly string[]
  readonly termCount: number
  readonly lasaTermsPresent: readonly string[]
  readonly pushedToward: string
  readonly readBackThenProves: string
  readonly runnable: boolean
  readonly whyNotRunnable: string | null
}

export const KEYTERMS_AB_TITLE = "The keyterms A/B, and why only one arm can be run"

export const KEYTERMS_AB_LEDE =
  "A competitor invites the reader to try it: ask for your hydrochlorothiazide, then delete the list and publish again. The invitation is a good one and the effect is real. One of the two arms, though, is a configuration this product will not ship, so the switch below shows what each list does to the read-back instead of offering both as settings."

export const SAMPLE_SIZE = 6

export const PHRASE_WINDOW = 2

export const COMPETITOR_PROMPT_LINE = "always confirm the medication back"

export const COMPETITOR_CITATION =
  "Observed 16 September 2026 in a submission that carries a published pair member in its keyterms list while its system prompt says to always confirm the medication back. The read-back is there; the list makes it circular."

export const CIRCULARITY =
  "Keyterms bias the recognizer toward exactly the strings listed. Put a pair member in the list and the recognizer returns that string more readily; the read-back then asks the caller to confirm the string the configuration suggested. The confirmation still happens, and it still proves nothing the configuration did not already assume. That is what makes the second arm invalid as a product option rather than merely worse."

export const WHY_NO_NUMBER =
  "There is no measured figure for the biased arm and there will not be one. Producing it means sending a published pair member to the recognizer as a hint, which is what the purity test refuses, so the honest cell here is an absence rather than a number nobody produced."

export const MEASURED_ARM_NOTE =
  "The shipped arm is the one the recorded sets were measured on: every result file under eval/ carries keyterms 0 for the recognizer socket, and the identity context that does go in is sampled below."

export const NO_MICROPHONE_NOTE =
  "Both columns are read off the built lists and the curated pair table on this page. Nothing here opens a socket or sends audio, so the comparison costs no credit and needs no microphone."

export function lasaTermsInside(terms: readonly string[]): readonly string[] {
  const forbidden = lasaCheckedTerms()
  const found: string[] = []
  for (const term of terms) {
    const tokens = normalizeTerm(term).split(" ")
    for (let size = 1; size <= PHRASE_WINDOW; size += 1) {
      for (let index = 0; index + size <= tokens.length; index += 1) {
        const phrase = tokens.slice(index, index + size).join(" ")
        if (forbidden.has(phrase) && !found.includes(phrase)) {
          found.push(phrase)
        }
      }
    }
  }
  return Object.freeze(found)
}

function biasedSampleFromPairTable(size: number): readonly string[] {
  const out: string[] = []
  for (const pair of LASA_PAIRS) {
    if (out.length >= size) {
      break
    }
    out.push(pair.termA)
    if (out.length < size) {
      out.push(pair.termB)
    }
  }
  return Object.freeze(out)
}

function shippedArm(): KeytermsArm {
  const terms = buildKeyterms()
  return Object.freeze({
    id: "shipped" as const,
    title: "Shipped list: identity context only",
    listLabel: "what this deployment sends as keyterms",
    sample: Object.freeze(terms.slice(0, SAMPLE_SIZE)),
    termCount: terms.length,
    lasaTermsPresent: lasaTermsInside(terms),
    pushedToward:
      "Clinic and prescriber names, dosage forms, units, route words and the spelling alphabet. Not one of these is a string the pair check examines.",
    readBackThenProves:
      "The recognizer's output on a drug name owes nothing to the rules that verify it, so a confirmation is evidence about what the caller said.",
    runnable: true,
    whyNotRunnable: null,
  })
}

function biasedArm(): KeytermsArm {
  const sample = biasedSampleFromPairTable(SAMPLE_SIZE)
  return Object.freeze({
    id: "biased" as const,
    title: "Biased list: pair members as recognizer hints",
    listLabel: "what the competitor's configuration sends",
    sample,
    termCount: sample.length,
    lasaTermsPresent: lasaTermsInside(sample),
    pushedToward:
      "The medicine names themselves, drawn straight off the published pair table, alongside a prompt instructing the agent to confirm every medication back.",
    readBackThenProves:
      "Nothing the list had not already suggested. Observation and verification draw on the same hint, so the read-back sits on top of a biased recognition and cannot separate the two.",
    runnable: false,
    whyNotRunnable:
      "This arm is described, not runnable. A switch that produced it would make the configuration a product option, and the purity test exists so that no code path can send a pair member as a hint.",
  })
}

export const KEYTERMS_ARMS: readonly KeytermsArm[] = Object.freeze([shippedArm(), biasedArm()])

export function keytermsArmFor(id: KeytermsArmId): KeytermsArm {
  const found = KEYTERMS_ARMS.find((arm) => arm.id === id)
  if (found === undefined) {
    throw new RangeError(`unknown keyterms arm: ${id}`)
  }
  return found
}

export const KEYTERMS_BUDGET = KEYTERMS_MAX

export type TabArrowKey = "ArrowLeft" | "ArrowRight" | "Home" | "End"

const ARROW_KEYS: ReadonlySet<string> = new Set(["ArrowLeft", "ArrowRight", "Home", "End"])

export function isTabArrowKey(key: string): key is TabArrowKey {
  return ARROW_KEYS.has(key)
}

export function nextTabIndex(current: number, key: TabArrowKey, count: number): number {
  if (count <= 0) {
    throw new RangeError("a tablist with no tabs has no next index to move to")
  }
  if (key === "Home") {
    return 0
  }
  if (key === "End") {
    return count - 1
  }
  const step = key === "ArrowRight" ? 1 : -1
  return (current + step + count) % count
}
