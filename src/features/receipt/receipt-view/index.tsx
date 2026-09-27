"use client"

import { useEffect, useState } from "react"
import {
  type OrderReceipt,
  type ReceiptRecheck,
  referenceNumberFor,
  WITNESS_BOUNDARY_NOTE,
} from "@/domain"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { Timecode } from "@/shared/ui/data-display/timecode"
import { DownloadIcon } from "@/shared/ui/icons"
import { Button } from "@/shared/ui/primitives/button"
import { verifyReceiptInBrowser } from "../verify-receipt"
import { WitnessBadge } from "../witness-badge"
import styles from "./styles.module.css"

export type ReceiptViewProps = {
  readonly receipt: OrderReceipt
  readonly fhir: unknown
  readonly serverRecheck: ReceiptRecheck | null
  readonly source: "server" | "file"
}

function download(name: string, value: unknown): void {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}

export function ReceiptView({ receipt, fhir, serverRecheck, source }: ReceiptViewProps) {
  const [verification, setVerification] = useState<ReceiptRecheck | null>(null)
  useEffect(() => {
    let live = true
    setVerification(null)
    void verifyReceiptInBrowser(receipt).then((result) => {
      if (live) {
        setVerification(result)
      }
    })
    return () => {
      live = false
    }
  }, [receipt])
  const catalogue = serverRecheck?.checks.filter((entry) => entry.check === "catalog") ?? []
  const verdict = verification?.verdict ?? null
  return (
    <section className={styles.receipt} aria-label="Order receipt">
      <output
        className={[
          styles.verdict,
          verdict === "TAMPERED" ? styles.tampered : styles.valid,
        ].join(" ")}
        aria-live="polite"
      >
        <span className={styles.verdictWord}>{verdict ?? "CHECKING"}</span>
        <span className={styles.verdictNote}>
          {source === "file" ? "the file you chose" : "the receipt the server issued"},
          rechecked in this browser: sha256, NPI, DEA and the published pairs
        </span>
      </output>
      <ul className={styles.checks}>
        {(verification?.checks ?? []).map((entry) => (
          <li key={`${entry.field}-${entry.check}`} className={styles.check}>
            <code className={styles.code}>{entry.check}</code>
            <span>{entry.passed ? "passed" : "failed"}</span>
            <span className={styles.detail}>{entry.detail}</span>
          </li>
        ))}
        {catalogue.map((entry) => (
          <li key={`server-${entry.field}`} className={styles.check}>
            <code className={styles.code}>catalog, on the server</code>
            <span>{entry.passed ? "passed" : "failed"}</span>
            <span className={styles.detail}>{entry.detail}</span>
          </li>
        ))}
      </ul>
      <dl className={styles.facts}>
        <div>
          <dt>Reference</dt>
          <dd className={styles.mono}>{referenceNumberFor(receipt.orderId)}</dd>
        </div>
        <div>
          <dt>Committed</dt>
          <dd>{receipt.committedAt}</dd>
        </div>
        <div>
          <dt>Recognizer model</dt>
          <dd>{receipt.actualModel ?? "not reported"}</dd>
        </div>
        <div>
          <dt>Origin</dt>
          <dd>{receipt.origin}</dd>
        </div>
        <div>
          <dt>sha256</dt>
          <dd className={styles.mono}>{receipt.sha256}</dd>
        </div>
      </dl>
      <table className={styles.fields}>
        <caption className={styles.caption}>Fields, with the words each came from</caption>
        <thead>
          <tr>
            <th scope="col">Field</th>
            <th scope="col">Value</th>
            <th scope="col">Proved by</th>
            <th scope="col">Spoken at</th>
            {receipt.witness === undefined ? null : <th scope="col">Vendor transcript</th>}
          </tr>
        </thead>
        <tbody>
          {receipt.fields.map((field) => (
            <tr key={field.field}>
              <th scope="row">{FIELD_LABEL[field.field] ?? field.field}</th>
              <td>{String(field.value)}</td>
              <td>{field.confirmationMode}</td>
              <td>
                <Timecode startMs={field.provenance.startMs} endMs={field.provenance.endMs} />
              </td>
              {receipt.witness === undefined ? null : (
                <td>
                  <WitnessBadge witness={receipt.witness} field={field.field} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {receipt.witness === undefined ? null : (
        <p className={styles.caption}>{WITNESS_BOUNDARY_NOTE}.</p>
      )}
      <div className={styles.actions}>
        <Button onClick={() => download(`receipt-${receipt.orderId}.json`, receipt)}>
          <DownloadIcon />
          Download receipt
        </Button>
        {fhir === null || fhir === undefined ? null : (
          <Button onClick={() => download(`fhir-${receipt.orderId}.json`, fhir)}>
            <DownloadIcon />
            Download FHIR JSON
          </Button>
        )}
        <Button onClick={() => globalThis.print?.()}>Print</Button>
      </div>
    </section>
  )
}
