import type { BenchmarkRow } from "@/domain"
import { Method } from "@/shared/ui/data-display/method"
import { MoreLink } from "@/shared/ui/navigation/more-link"
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
        <Method
          command={shipped.command}
          n={shipped.n ?? "not recorded"}
          set={shipped.input === "text" ? "text candidates" : shipped.input}
        />
        <MoreLink href={CATCH_FIGURES_HREF}>
          Full figures, and what the rule costs in seconds
        </MoreLink>
      </p>
    </aside>
  )
}
