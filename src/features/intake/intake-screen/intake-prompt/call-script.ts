import { FieldName } from "@/domain"
import { FIELD_LABEL } from "../../field-language"

export const CALL_EXAMPLE_NPI_DIGITS = "1234567893"

export const CALL_EXAMPLE_DRUG = "lisinopril"

export type ScriptPart = {
  readonly text: string
  readonly value?: boolean
}

export type ScriptLine = {
  readonly parts: readonly ScriptPart[]
  readonly fills: readonly FieldName[]
  readonly reads?: string
}

const CALLER_LABEL: Readonly<Partial<Record<FieldName, string>>> = Object.freeze({
  [FieldName.Sig]: "How to take it",
})

export function fillLabel(field: FieldName): string {
  return CALLER_LABEL[field] ?? FIELD_LABEL[field]
}

export const CALL_SCRIPT: readonly ScriptLine[] = Object.freeze([
  {
    parts: [{ text: "Patient " }, { text: "Sam Rivera", value: true }, { text: "." }],
    fills: [FieldName.PatientName],
  },
  {
    parts: [
      { text: "Lisinopril", value: true },
      { text: ", " },
      { text: "ten milligrams", value: true },
      { text: ", one tablet by mouth once daily, thirty tablets." },
    ],
    fills: [
      FieldName.DrugName,
      FieldName.Strength,
      FieldName.Route,
      FieldName.Sig,
      FieldName.Quantity,
    ],
  },
  {
    parts: [
      { text: "Prescriber NPI " },
      { text: "one two three four five six seven eight nine three", value: true },
      { text: "." },
    ],
    fills: [FieldName.PrescriberNpi],
    reads: CALL_EXAMPLE_NPI_DIGITS,
  },
])

export function spokenLine(line: ScriptLine): string {
  return line.parts.map((part) => part.text).join("")
}

export const CALL_EXAMPLES: readonly string[] = Object.freeze(CALL_SCRIPT.map(spokenLine))
