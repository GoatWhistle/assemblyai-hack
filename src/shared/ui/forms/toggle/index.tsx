"use client"

import { useId } from "react"
import styles from "./styles.module.css"

export type ToggleProps = {
  readonly label: string
  readonly checked: boolean
  readonly onChange: (checked: boolean) => void
  readonly hint?: string
  readonly disabled?: boolean
  readonly dangerWhenOn?: boolean
}

export function Toggle({
  label,
  checked,
  onChange,
  hint,
  disabled = false,
  dangerWhenOn = false,
}: ToggleProps) {
  const labelId = useId()
  const hintId = useId()
  const classes = [styles.field, dangerWhenOn ? styles.dangerOn : ""]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <div className={classes}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={labelId}
        aria-describedby={hint === undefined ? undefined : hintId}
        className={styles.control}
        disabled={disabled}
        onClick={() => onChange(!checked)}
      >
        <span className={styles.knob} />
      </button>
      <span className={styles.label} id={labelId}>
        {label}
      </span>
      {hint === undefined ? null : (
        <span className={styles.hint} id={hintId}>
          {hint}
        </span>
      )}
    </div>
  )
}
