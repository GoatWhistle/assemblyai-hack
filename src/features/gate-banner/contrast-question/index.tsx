import type { CSSProperties } from "react"
import styles from "./styles.module.css"

export type ContrastQuestionProps = {
  readonly candidates: readonly string[]
}

export function spokenChoice(names: readonly string[]): string {
  if (names.length <= 2) {
    return names.join(" or ")
  }
  return `${names.slice(0, -1).join(", ")} or ${names.at(-1) ?? ""}`
}

export function landingSide(index: number, count: number): string {
  if (count < 2) {
    return "0"
  }
  if (index === 0) {
    return "-0.5rem"
  }
  return index === count - 1 ? "0.5rem" : "0"
}

export function ContrastQuestion({ candidates }: ContrastQuestionProps) {
  return (
    <div className={styles.question}>
      <p className={styles.label}>
        The question, answered only by saying a name: {candidates.length} names on the published
        list
      </p>
      <p className={styles.text}>
        {candidates.map((name, index) => (
          <span key={name}>
            {index === 0 ? null : (
              <span className={styles.joiner}>
                {index === candidates.length - 1 ? " or " : ", "}
              </span>
            )}
            <span
              className={styles.name}
              data-motion="fade"
              style={{ "--land-x": landingSide(index, candidates.length) } as CSSProperties}
            >
              {name}
            </span>
          </span>
        ))}
        ?
      </p>
      <p className={styles.note}>
        A yes is not an answer to it: the field stays empty until the caller says one of the
        names aloud, and saying a different one corrects the value.
      </p>
    </div>
  )
}
