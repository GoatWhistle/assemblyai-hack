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
}

export function CopyButton({ value, label }: CopyButtonProps) {
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

  return (
    <span className={styles.wrap}>
      <button
        type="button"
        className={styles.button}
        aria-label={label}
        data-state={state}
        onClick={() => {
          void onCopy()
        }}
      >
        {state === "copied" ? (
          <CheckIcon className={styles.icon} />
        ) : (
          <CopyIcon className={styles.icon} />
        )}
      </button>
      <output className={styles.note} data-state={state}>
        {note}
      </output>
    </span>
  )
}
