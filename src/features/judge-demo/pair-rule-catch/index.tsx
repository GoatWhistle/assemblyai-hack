import Link from "next/link"
import type { BenchmarkRow } from "@/domain"
import { Command } from "@/shared/ui/data-display/command"
import styles from "./styles.module.css"

export const CATCH_FIGURES_HREF = "/metrics#headline"

export type PairRuleCatchProps = {
  readonly without: BenchmarkRow
  readonly shipped: BenchmarkRow
}

export function PairRuleCatch({ without, shipped }: PairRuleCatchProps) {
  return (
    <aside className={styles.catch} aria-label="What the pair rule catches, measured">
      <p className={styles.figure}>
        Measured on {shipped.n ?? "an unrecorded number of"} seeded pair mishearings: a reflex
        yes writes the wrong drug in <strong className={styles.value}>{without.value}</strong>{" "}
        without the pair rule, and in <strong className={styles.value}>{shipped.value}</strong>{" "}
        with it.
      </p>
      <p className={styles.method}>
        <Command value={shipped.command} />
        <span>
          n = {shipped.n ?? "not recorded"} · {shipped.input} ·{" "}
          {shipped.measuredOn ?? "undated"}
        </span>
        <Link href={CATCH_FIGURES_HREF}>Full figures, and what the rule costs in seconds</Link>
      </p>
    </aside>
  )
}
