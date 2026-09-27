"use client"

import { useEffect, useRef, useState } from "react"
import { CheckIcon, CopyIcon } from "@/shared/ui/icons"
import styles from "./styles.module.css"

export const COPIED_NOTE = "Copied"
export const COPY_FAILED_NOTE = "Copy failed, select the text instead"
export const COPY_RESET_MS = 2000

type CopyState = "idle" | "copied" | "failed"

function copyBySelection(value: string): boolean {
  const doc = globalThis.document
  if (doc === undefined || typeof doc.execCommand !== "function") {
    return false
  }
  const field = doc.createElement("textarea")
  field.value = value
  field.setAttribute("readonly", "")
  field.className = "visually-hidden"
  doc.body.append(field)
  field.select()
  try {
    return doc.execCommand("copy")
  } catch {
    return false
  } finally {
    field.remove()
  }
}

export async function copyText(value: string): Promise<boolean> {
  const clipboard = globalThis.navigator?.clipboard
  if (clipboard !== undefined && typeof clipboard.writeText === "function") {
    try {
      await clipboard.writeText(value)
      return true
    } catch {
      return copyBySelection(value)
    }
  }
  return copyBySelection(value)
}

export type CopyButtonProps = {
  readonly value: string
  readonly label: string
  readonly className?: string
}

export function CopyButton({ value, label, className }: CopyButtonProps) {
  const [state, setState] = useState<CopyState>("idle")
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current !== null) {
        clearTimeout(timer.current)
      }
    },
    [],
  )

  const onCopy = async () => {
    const copied = await copyText(value)
    setState(copied ? "copied" : "failed")
    if (timer.current !== null) {
      clearTimeout(timer.current)
    }
    timer.current = setTimeout(() => setState("idle"), COPY_RESET_MS)
  }

  const note = state === "copied" ? COPIED_NOTE : state === "failed" ? COPY_FAILED_NOTE : ""
  const [shown, setShown] = useState(note)
  if (note !== "" && note !== shown) {
    setShown(note)
  }

  return (
    <span
      className={className === undefined ? styles.wrap : `${styles.wrap} ${className}`}
      data-state={state}
    >
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        data-state={state}
        onClick={() => {
          void onCopy()
        }}
      >
        <CopyIcon className={`${styles.icon} ${styles.copy}`} />
        <CheckIcon className={`${styles.icon} ${styles.check}`} />
      </button>
      <output className="visually-hidden">{note}</output>
      <span className={styles.note} data-state={state} aria-hidden="true">
        {shown}
      </span>
    </span>
  )
}
