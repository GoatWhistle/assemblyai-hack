"use client"

import { useEffect, useId, useState } from "react"
import type { OrderReceipt } from "@/domain"
import { ErrorState } from "@/shared/ui/states/error-state"
import { loadReceipt, type ReceiptLoad } from "../load-receipt"
import { ReceiptView } from "../receipt-view"
import { parseReceipt } from "../verify-receipt"
import styles from "./styles.module.css"

function readFileText(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ""))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export type OrderCheckProps = {
  readonly sessionId: string
}

export function OrderCheck({ sessionId }: OrderCheckProps) {
  const [load, setLoad] = useState<ReceiptLoad>({ state: "loading" })
  const [file, setFile] = useState<OrderReceipt | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const inputId = useId()

  useEffect(() => {
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
      {load.state === "loading" ? (
        <output className={styles.note}>Fetching the receipt for {sessionId}.</output>
      ) : null}
      {load.state === "missing" ? (
        <ErrorState title="No receipt for this session" body={<p>{load.message}</p>} />
      ) : null}
      {load.state === "failed" ? (
        <ErrorState
          title="The receipt could not be loaded"
          body={<p>{load.message}</p>}
          code={load.status === null ? "no response" : `HTTP ${load.status}`}
        />
      ) : null}
      {load.state === "loaded" && file === null ? (
        <ReceiptView
          receipt={load.receipt}
          fhir={load.fhir}
          serverRecheck={load.serverRecheck}
          source="server"
        />
      ) : null}
      {file === null ? null : (
        <ReceiptView receipt={file} fhir={null} serverRecheck={null} source="file" />
      )}
      <div className={styles.upload}>
        <label className={styles.label} htmlFor={inputId}>
          Check a receipt file instead. Change one character in a downloaded receipt and it
          reads TAMPERED.
        </label>
        <input
          id={inputId}
          className={styles.input}
          type="file"
          accept="application/json,.json"
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
        {fileError === null ? null : (
          <p className={styles.error} role="alert">
            {fileError}
          </p>
        )}
      </div>
    </div>
  )
}
