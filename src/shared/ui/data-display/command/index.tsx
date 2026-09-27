import { CopyButton } from "@/shared/ui/primitives/copy-button"
import styles from "./styles.module.css"

export type CommandProps = {
  readonly value: string
  readonly className?: string
}

export function copyCommandLabel(value: string): string {
  return `Copy command: ${value}`
}

export function Command({ value, className }: CommandProps) {
  const classes = [styles.command, className ?? ""].filter((part) => part !== "").join(" ")
  return (
    <span className={classes}>
      <code className={styles.code}>{value}</code>
      <CopyButton value={value} label={copyCommandLabel(value)} />
    </span>
  )
}
