import { MoreLink } from "@/shared/ui/navigation/more-link"
import { LIMITATIONS } from "./limitation-entries"
import type { Limitation } from "./limitation-types"
import styles from "./styles.module.css"

export { LIMITATIONS, limitationsIn } from "./limitation-entries"
export type { Limitation, LimitationGroup } from "./limitation-types"

export type LimitsProps = {
  readonly entries?: readonly Limitation[]
}

export function Limits({ entries = LIMITATIONS }: LimitsProps) {
  return (
    <div className={styles.frame}>
      <ul className={styles.limits}>
        {entries.map((limit) => (
          <li key={limit.id} id={`limit-${limit.id}`} className={styles.limit}>
            <h3 className={styles.title}>{limit.title}</h3>
            <p className={styles.status}>{limit.status}</p>
            <p className={styles.body}>{limit.body}</p>
            {limit.points === undefined ? null : (
              <ul className={styles.points}>
                {limit.points.map((point) => (
                  <li key={point}>{point}</li>
                ))}
              </ul>
            )}
            {limit.link === undefined ? null : (
              <p className={styles.more}>
                <MoreLink href={limit.link.href}>{limit.link.label}</MoreLink>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
