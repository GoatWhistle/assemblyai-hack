"use client"

import { useId } from "react"
import styles from "./styles.module.css"

export type SelectOption = {
  readonly value: string
  readonly label: string
}

export type SelectFieldProps = {
  readonly label: string
  readonly value: string
  readonly options: readonly SelectOption[]
  readonly onChange: (value: string) => void
  readonly hint?: string
  readonly disabled?: boolean
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  hint,
  disabled = false,
}: SelectFieldProps) {
  const id = useId()
  const hintId = useId()
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={styles.control}
        value={value}
        disabled={disabled}
        aria-describedby={hint === undefined ? undefined : hintId}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint === undefined ? null : (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )}
    </div>
  )
}
