import { FieldName } from "@/domain"
import { FIELD_LABEL, FIELD_PROOF_NOTE } from "@/features/intake/field-language"
import { Table, type TableColumn } from "@/shared/ui/data-display/table"

const SHOWN: readonly FieldName[] = [
  FieldName.PrescriberNpi,
  FieldName.PrescriberDea,
  FieldName.DrugName,
  FieldName.Strength,
  FieldName.Sig,
  FieldName.PatientName,
]

const COLUMNS: readonly TableColumn[] = [
  { key: "field", title: "Field", rowHeader: true },
  { key: "proof", title: "What proves it", kind: "muted", stack: "bare" },
]

export function ProofLadder() {
  return (
    <Table
      label="What counts as proof, per field"
      columns={COLUMNS}
      rows={SHOWN.map((field) => ({
        key: field,
        cells: { field: FIELD_LABEL[field], proof: FIELD_PROOF_NOTE[field] },
      }))}
    />
  )
}
