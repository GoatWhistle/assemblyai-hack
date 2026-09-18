"use client"

import type { ButtonHTMLAttributes, ReactNode } from "react"
import styles from "./styles.module.css"

type ButtonTone = "neutral" | "primary" | "danger" | "quiet"
type ButtonSize = "small" | "medium" | "large"

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & {
  readonly tone?: ButtonTone
  readonly size?: ButtonSize
  readonly loading?: boolean
  readonly loadingLabel?: string
  readonly children: ReactNode
}

const TONE_CLASS: Record<ButtonTone, string> = {
  neutral: "",
  primary: styles.primary ?? "",
  danger: styles.danger ?? "",
  quiet: styles.quiet ?? "",
}

const SIZE_CLASS: Record<ButtonSize, string> = {
  small: styles.small ?? "",
  medium: "",
  large: styles.large ?? "",
}

export function Button({
  tone = "neutral",
  size = "medium",
  loading = false,
  loadingLabel = "Working",
  children,
  disabled,
  type = "button",
  ...rest
}: ButtonProps) {
  const classes = [
    styles.button,
    TONE_CLASS[tone],
    SIZE_CLASS[size],
    loading ? styles.loading : "",
  ]
    .filter((value) => value !== undefined && value !== "")
    .join(" ")
  return (
    <button
      {...rest}
      type={type}
      className={classes}
      disabled={disabled === true || loading}
      aria-busy={loading || undefined}
    >
      {children}
      {loading ? (
        <span className={styles.spinner}>
          <span className={styles.spinnerDot} />
          <span className="visually-hidden">{loadingLabel}</span>
        </span>
      ) : null}
    </button>
  )
}
