import type { ReactNode } from "react"
import styles from "./styles.module.css"

export type DocSectionProps = {
  readonly id: string
  readonly title: ReactNode
  readonly lead?: ReactNode
  readonly children?: ReactNode
}

export function DocSection({ id, title, lead, children }: DocSectionProps) {
  const titleId = `${id}-title`
  return (
    <section className={styles.section} id={id} aria-labelledby={titleId}>
      <div className={styles.head}>
        <h2 className={styles.title} id={titleId}>
          {title}
        </h2>
        {lead === undefined ? null : <p className={styles.lead}>{lead}</p>}
      </div>
      {children === undefined ? null : <div className={styles.body}>{children}</div>}
    </section>
  )
}
