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
    title: "The pair table is curated, not imported",
    body: "The ISMP list moved to ECRI and is no longer at a stable public URL, so the build falls back to a hand-curated table of 20 pairs rather than a parsed one. Matching strips salt forms, because the catalogue stores tramadol hydrochloride where the pair says tramadol.",
  },
]

export function Limits() {
  return (
    <section className={styles.limits}>
      <div className={styles.lede}>
        <h2 className={styles.title}>What this does not prove</h2>
        <p className={styles.body}>
          Stated here rather than left to be discovered. A demonstration that hides its own
          boundary is the failure mode this product exists to argue against.
        </p>
      </div>

      <ul className={styles.list}>
        {LIMITS.map((limit) => (
          <li key={limit.id} className={styles.item}>
            <p className={styles.itemTitle}>{limit.title}</p>
            <p className={styles.itemBody}>{limit.body}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}
