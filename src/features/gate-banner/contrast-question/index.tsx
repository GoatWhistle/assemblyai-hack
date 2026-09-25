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

export function ContrastQuestion({ candidates }: ContrastQuestionProps) {
  return (
    <div className={styles.question}>
      <p className={styles.label}>
        The question, answered only by saying a name: {candidates.length} names on the published
        list
      </p>
      <p className={styles.text}>{spokenChoice(candidates)}?</p>
      <p className={styles.note}>
        A yes is not an answer to it: the field stays empty until the caller says one of the
        names aloud, and saying a different one corrects the value.
      </p>
    </div>
  )
}
