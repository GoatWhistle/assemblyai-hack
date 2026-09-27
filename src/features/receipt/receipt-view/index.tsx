"use client"

import { useEffect, useState } from "react"
import {
  type OrderReceipt,
  type ReceiptRecheck,
  referenceNumberFor,
  WITNESS_BOUNDARY_NOTE,
} from "@/domain"
import { FIELD_LABEL } from "@/features/intake/field-language"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"
import { Timecode } from "@/shared/ui/data-display/timecode"
import { DownloadIcon } from "@/shared/ui/icons"
import { Button } from "@/shared/ui/primitives/button"
import { StatusChip } from "@/shared/ui/primitives/status-chip"
import { verifyReceiptInBrowser } from "../verify-receipt"
import { WitnessBadge } from "../witness-badge"
import styles from "./styles.module.css"

export type ReceiptViewProps = {
  readonly receipt: OrderReceipt
  readonly fhir: unknown
  readonly serverRecheck: ReceiptRecheck | null
  readonly source: "server" | "file"
}

const CHECK_COLUMNS: readonly TableColumn[] = [
  { key: "check", title: "Check", size: "fit" },
  { key: "result", title: "Result", size: "fit" },
  { key: "detail", title: "What was recomputed", kind: "muted" },
]

const FIELD_COLUMNS: readonly TableColumn[] = [
  { key: "field", title: "Field", rowHeader: true, size: "fit" },
  { key: "value", title: "Value" },
  { key: "mode", title: "Proved by" },
  { key: "spoken", title: "Spoken at", size: "fit" },
]

const WITNESS_COLUMN: TableColumn = { key: "witness", title: "Vendor transcript", size: "fit" }

function Result({ passed }: { readonly passed: boolean }) {
  return passed ? (
    <StatusChip status="written">passed</StatusChip>
  ) : (
    <StatusChip status="alert">failed</StatusChip>
  )
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
        <span
          key={verdict ?? "checking"}
          className={[
            styles.verdictWord,
            verdict === null ? styles.pending : styles.stamped,
          ].join(" ")}
        >
          {verdict ?? "CHECKING"}
        </span>
        <span className={styles.verdictNote}>
          {source === "file" ? "the file you chose" : "the receipt the server issued"},
          rechecked in this browser: sha256, NPI, DEA and the published pairs
        </span>
      </output>
      <div className={styles.checks}>
        <Table
          label="Checks recomputed in this browser"
          columns={CHECK_COLUMNS}
          rows={[
            ...(verification?.checks ?? []).map((entry) => ({
              key: `${entry.field}-${entry.check}`,
              tone: entry.passed ? ("normal" as const) : ("alert" as const),
              cells: {
                check: <code className={styles.code}>{entry.check}</code>,
                result: <Result passed={entry.passed} />,
                detail: entry.detail,
              },
            })),
            ...catalogue.map((entry) => ({
              key: `server-${entry.field}`,
              tone: entry.passed ? ("normal" as const) : ("alert" as const),
              cells: {
                check: <code className={styles.code}>catalog, on the server</code>,
                result: <Result passed={entry.passed} />,
                detail: entry.detail,
              },
            })),
          ]}
        />
      </div>
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
      <Table
        label="Order fields"
        caption="Fields, with the words each came from"
        columns={
          receipt.witness === undefined ? FIELD_COLUMNS : [...FIELD_COLUMNS, WITNESS_COLUMN]
        }
        rows={receipt.fields.map((field) => ({
          key: field.field,
          cells: {
            field: FIELD_LABEL[field.field] ?? field.field,
            value: String(field.value),
            mode: <code className={styles.code}>{field.confirmationMode}</code>,
            spoken: (
              <Timecode startMs={field.provenance.startMs} endMs={field.provenance.endMs} />
            ),
            witness: <WitnessBadge witness={receipt.witness} field={field.field} />,
          },
        }))}
      />
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
