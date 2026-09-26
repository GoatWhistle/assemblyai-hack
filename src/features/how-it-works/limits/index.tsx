import { ismpPairCount, LASA_PAIRS } from "@/lasa"
import { Disclosure } from "@/shared/ui/navigation/disclosure"
import styles from "./styles.module.css"

type Limit = {
  readonly id: string
  readonly title: string
  readonly body: string
}

const LIMITS: readonly Limit[] = [
  {
    id: "provenance",
    title: "Provenance is computed in the browser",
    body: "The browser holds the recognizer socket directly, so word timings never pass through our server. For a demonstration that is irrelevant; as a trust boundary it is client-supplied data, and making it otherwise would mean routing audio through a host we deliberately removed.",
  },
  {
    id: "latency",
    title: "Word-to-gate latency is a browser measurement",
    body: "The session endpoint returns time to first audio and tool timings, but not word-level timings. Every figure on the measurements page carries the command that produced it and the size of the set it came from.",
  },
  {
    id: "lasa",
    title: "The rule is the published list; the evaluation is the curated core",
    body: `The pair rule applies the full 2023 ISMP List of Confused Drug Names, ${ismpPairCount()} pairs parsed from the published PDF with the page and row of each kept. Our measured catches and the demo rest on a hand-curated table of ${LASA_PAIRS.length} pairs, each checked by hand against its row; the rest of the list is applied, not separately evaluated. Matching strips salt forms, because the catalogue stores tramadol hydrochloride where the pair says tramadol.`,
  },
]

export function Limits() {
  return (
    <div className={styles.limits}>
      {LIMITS.map((limit) => (
        <Disclosure key={limit.id} id={`limit-${limit.id}`} summary={limit.title}>
          <p>{limit.body}</p>
        </Disclosure>
      ))}
    </div>
  )
}
