"use client"

import { type ReactNode, useEffect, useRef } from "react"
import { Button } from "@/shared/ui/primitives/button"
import styles from "./styles.module.css"

export type DialogProps = {
  readonly open: boolean
  readonly title: string
  readonly onClose: () => void
  readonly children: ReactNode
  readonly footer?: ReactNode
  readonly closeLabel?: string
}

export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel = "Close",
}: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const element = ref.current
    if (element === null) {
      return
    }
    if (open && !element.open) {
      if (typeof element.showModal === "function") {
        element.showModal()
      } else {
        element.setAttribute("open", "")
      }
      return
    }
    if (!open && element.open) {
      element.close()
    }
  }, [open])

  return (
    <dialog ref={ref} className={styles.dialog} onCancel={onClose} onClose={onClose}>
      <div className={styles.head}>
        <h2 className={styles.title}>{title}</h2>
        <Button tone="quiet" size="small" onClick={onClose}>
          {closeLabel}
        </Button>
      </div>
      <div className={styles.body}>{children}</div>
      {footer === undefined ? null : <div className={styles.foot}>{footer}</div>}
    </dialog>
  )
}
