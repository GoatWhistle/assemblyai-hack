"use client"

import { useId } from "react"
import { Panel } from "@/shared/ui/primitives/panel"
import styles from "./styles.module.css"
import { useNotice } from "./use-notice"

export const DISCLAIMER_TITLE = "This is a technology demonstration, not a medical device"

export const DISCLAIMER_BODY =
  "Synthetic data only. No real patients, no real prescriptions, and nothing here is clinical advice. The catalogues are public reference data and the gate is a software invariant, not a regulatory approval."

export const DISCLAIMER_AFFILIATION =
  "This project quotes ISMP, the FDA, the Joint Commission and 21 CFR. It is not affiliated with, endorsed by, or reviewed by any of them. Those citations establish that read-back is an existing requirement; they establish nothing about this software."

export const DISCLAIMER_NO_REAL_DATA = "Do not enter real patient data into this application."

export const NOTICE_LABEL =
  "Medical disclaimer: a technology demonstration, not a medical device"

export const PRINT_BODY = [
  DISCLAIMER_BODY,
  DISCLAIMER_AFFILIATION,
  DISCLAIMER_NO_REAL_DATA,
].join("\n\n")

function NoticeGlyph({ className }: { readonly className?: string }) {
  return (
    <svg
      className={className}
      width="20"
      height="20"
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
    >
      <circle className={styles.disc} cx="10" cy="10" r="9.25" />
      <path className={styles.stem} d="M10 5.6v5.4" />
      <circle className={styles.dot} cx="10" cy="14.2" r="1.2" />
    </svg>
  )
}

export function DisclaimerNotice() {
  const notice = useNotice()
  const sheetId = useId()
  return (
    <>
      <button
        ref={notice.trigger}
        type="button"
        className={styles.trigger}
        aria-label={NOTICE_LABEL}
        aria-expanded={notice.open}
        aria-controls={sheetId}
        {...notice.triggerProps}
      >
        <NoticeGlyph className={styles.mark} />
      </button>
      <div
        ref={notice.sheet}
        id={sheetId}
        popover="manual"
        className={styles.sheet}
        hidden={!notice.open}
        data-open={notice.open ? "" : undefined}
        {...notice.sheetProps}
      >
        <Panel
          as="section"
          title={
            <span className={styles.title}>
              <NoticeGlyph className={styles.titleMark} />
              <span>{DISCLAIMER_TITLE}</span>
            </span>
          }
        >
          <p className={styles.body}>{DISCLAIMER_BODY}</p>
          <p className={styles.body}>{DISCLAIMER_AFFILIATION}</p>
          <p className={styles.warning}>{DISCLAIMER_NO_REAL_DATA}</p>
        </Panel>
      </div>
    </>
  )
}

export function PrintDisclaimer() {
  return (
    <div
      className={styles.print}
      aria-hidden="true"
      data-title={DISCLAIMER_TITLE}
      data-body={PRINT_BODY}
    />
  )
}
