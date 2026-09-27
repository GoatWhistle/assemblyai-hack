"use client"

import { useEffect, useId, useState } from "react"
import type { OrderReceipt } from "@/domain"
import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { Swap } from "@/shared/ui/motion/swap"
import { ActionLink } from "@/shared/ui/primitives/action-link"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { ErrorState } from "@/shared/ui/states/error-state"
import { loadReceipt, type ReceiptLoad } from "../load-receipt"
import { ReceiptView } from "../receipt-view"
import { parseReceipt } from "../verify-receipt"
import styles from "./styles.module.css"

export const FILE_CHECK_LABEL = "Check a receipt file"

export const FILE_CHECK_HINT =
  "Choose a receipt you downloaded. Change one character in it and it reads TAMPERED."

export const NO_RECEIPT_TITLE = "No receipt for this session"

function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

type Load = ReceiptLoad | { readonly state: "none" }

export type OrderCheckProps = {
  readonly sessionId: string | null
}

function NoReceipt() {
  return (
    <EmptyState
      illustration="receipt"
      title={NO_RECEIPT_TITLE}
      body={
        <p>
          Nothing was committed under this session, so there is no receipt to recheck. A receipt
          file you downloaded can still be checked below.
        </p>
      }
      actions={
        <>
          <ActionLink href={REPLAY_ENTRY_HREF} tone="primary">
            Watch the replay
          </ActionLink>
          <ActionLink href={CALL_HREF} tone="quiet">
            Start a call
          </ActionLink>
        </>
      }
    />
  )
}

function ServerStatus({
  load,
  sessionId,
  hidden,
}: {
  readonly load: ReceiptLoad
  readonly sessionId: string
  readonly hidden: boolean
}) {
  if (load.state === "loaded") {
    return hidden ? null : (
      <div className={styles.status} aria-live="polite">
        <ReceiptView
          receipt={load.receipt}
          fhir={load.fhir}
          serverRecheck={load.serverRecheck}
          source="server"
        />
      </div>
    )
  }
  return (
    <div className={styles.reserved} aria-live="polite">
      <Swap swapKey={load.state}>
        {load.state === "loading" ? (
          <p className={styles.note}>Fetching the receipt for {sessionId}.</p>
        ) : null}
        {load.state === "missing" ? <NoReceipt /> : null}
        {load.state === "failed" ? (
          <ErrorState
            title="The receipt could not be loaded"
            body={<p>{load.message}</p>}
            code={load.status === null ? "no response" : `HTTP ${load.status}`}
          />
        ) : null}
      </Swap>
    </div>
  )
}

export function OrderCheck({ sessionId }: OrderCheckProps) {
  const [load, setLoad] = useState<Load>(
    sessionId === null ? { state: "none" } : { state: "loading" },
  )
  const [file, setFile] = useState<OrderReceipt | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputId = useId()
  const hintId = useId()

  useEffect(() => {
    if (sessionId === null) {
      return
    }
    let live = true
    void loadReceipt(sessionId).then((result) => {
      if (live) {
        setLoad(result)
      }
    })
    return () => {
      live = false
    }
  }, [sessionId])

  return (
    <div className={styles.check}>
      {load.state === "none" ? null : (
        <ServerStatus load={load} sessionId={sessionId ?? ""} hidden={file !== null} />
      )}
      {file === null ? null : (
        <ReceiptView receipt={file} fhir={null} serverRecheck={null} source="file" />
      )}
      <div
        className={
          load.state === "none" && file === null
            ? `${styles.upload} ${styles.alone}`
            : styles.upload
        }
      >
        {load.state === "none" && file === null ? (
          <svg className={styles.glyph} viewBox="0 0 40 48" aria-hidden="true">
            <path d="M6 3h28v42l-4.7-3-4.6 3-4.7-3-4.6 3-4.7-3L6 45z" />
            <path d="M12 14h16M12 21h16M12 28h10" />
          </svg>
        ) : null}
        <label className={styles.pick} htmlFor={inputId}>
          {FILE_CHECK_LABEL}
        </label>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept="application/json,.json"
          aria-describedby={hintId}
          onChange={(event) => {
            const chosen = event.target.files?.[0]
            if (chosen === undefined) {
              return
            }
            void readFileText(chosen).then(
              (text) => {
                const parsed = parseReceipt(text)
                setFile(parsed)
                setFileError(parsed === null ? "That file is not a receipt." : null)
              },
              () => setFileError("That file could not be read."),
            )
          }}
        />
        <p className={styles.hint} id={hintId}>
          {FILE_CHECK_HINT}
        </p>
        <Swap swapKey={fileError ?? ""}>
          {fileError === null ? null : (
            <p className={styles.error} role="alert">
              {fileError}
            </p>
          )}
        </Swap>
      </div>
    </div>
  )
}
