import styles from "./styles.module.css"

export type FigureWithMethodProps = {
  readonly name: string
  readonly value: string | null
  readonly meaning: string
  readonly command: string
  readonly setDescription: string
  readonly tone?: "neutral" | "alert"
}

export const NOT_MEASURED = "not measured yet"

export function FigureWithMethod({
  name,
  value,
  meaning,
  command,
  setDescription,
  tone = "neutral",
}: FigureWithMethodProps) {
  const isMissing = value === null
  const valueClasses = [
    styles.value,
    isMissing ? styles.unavailable : "",
    tone === "alert" && !isMissing ? styles.alert : "",
  ]
    .filter((entry) => entry !== undefined && entry !== "")
    .join(" ")
  return (
    <figure className={styles.figure}>
      <span className={valueClasses}>{isMissing ? NOT_MEASURED : value}</span>
      <figcaption className={styles.body}>
        <span className={styles.name}>{name}</span>
        <span className={styles.meaning}>{meaning}</span>
        <span className={styles.method}>
          <code className={styles.command}>{command}</code>
          <span className={styles.setSize}>over {setDescription}</span>
        </span>
      </figcaption>
    </figure>
  )
}
