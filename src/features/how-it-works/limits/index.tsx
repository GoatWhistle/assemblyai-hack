import { Disclosure } from "@/shared/ui/navigation/disclosure"
import { MoreLink } from "@/shared/ui/navigation/more-link"
import { Panel } from "@/shared/ui/primitives/panel"
import { type Status, StatusChip } from "@/shared/ui/primitives/status-chip"
import { Heading } from "@/shared/ui/typography/heading"
import { LIMITATIONS } from "./limitation-entries"
import type { Limitation, LimitationStanding } from "./limitation-types"
import styles from "./styles.module.css"

export { LIMITATIONS, limitationsIn } from "./limitation-entries"
export type { Limitation, LimitationGroup, LimitationStanding } from "./limitation-types"

export const STANDING_LABEL: Readonly<Record<LimitationStanding, string>> = Object.freeze({
  measured: "Measured",
  enforced: "Enforced",
  assumed: "Assumed",
  admitted: "Admitted",
  disclosed: "Disclosed",
})

export const STANDING_STATUS: Readonly<Record<LimitationStanding, Status>> = Object.freeze({
  measured: "written",
  enforced: "pending",
  assumed: "inactive",
  admitted: "alert",
  disclosed: "tag",
})

export type LimitsProps = {
  readonly entries?: readonly Limitation[]
}

function Points({ limit }: { readonly limit: Limitation }) {
  if (limit.points === undefined) {
    return null
  }
  const list = (
    <ul className={styles.points}>
      {limit.points.map((point) => (
        <li key={point}>{point}</li>
      ))}
    </ul>
  )
  return limit.pointsLabel === undefined ? (
    list
  ) : (
    <Disclosure summary={limit.pointsLabel}>{list}</Disclosure>
  )
}

function Entry({ limit }: { readonly limit: Limitation }) {
  const label = STANDING_LABEL[limit.standing]
  return (
    <li id={`limit-${limit.id}`} className={styles.limit}>
      <div className={styles.head}>
        <Heading level={3}>{limit.title}</Heading>
        <p className={styles.status}>
          <StatusChip status={STANDING_STATUS[limit.standing]}>{label}</StatusChip>
          {limit.status === label ? null : <span>{limit.status}</span>}
        </p>
      </div>
      <p className={styles.body}>{limit.body}</p>
      <Points limit={limit} />
      {limit.link === undefined ? null : (
        <p className={styles.body}>
          <MoreLink href={limit.link.href}>{limit.link.label}</MoreLink>
        </p>
      )}
    </li>
  )
}

export function Limits({ entries = LIMITATIONS }: LimitsProps) {
  return (
    <Panel padding="none">
      <div className={styles.frame}>
        <ul className={styles.limits}>
          {entries.map((limit) => (
            <Entry key={limit.id} limit={limit} />
          ))}
        </ul>
      </div>
    </Panel>
  )
}

export function LimitTitles({ entries }: { readonly entries: readonly Limitation[] }) {
  return (
    <ul className={styles.titles}>
      {entries.map((limit) => (
        <li key={limit.id} className={styles.title}>
          <StatusChip status={STANDING_STATUS[limit.standing]}>
            {STANDING_LABEL[limit.standing]}
          </StatusChip>
          <MoreLink href={`/docs/limitations#limit-${limit.id}`}>{limit.title}</MoreLink>
        </li>
      ))}
    </ul>
  )
}
