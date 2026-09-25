import { FieldName, type OrderReceipt, type ReceiptField } from "@/domain"

const FHIR_NPI_SYSTEM = "http://hl7.org/fhir/sid/us-npi"

const FHIR_DEA_SYSTEM = "urn:oid:2.16.840.1.113883.4.814"

export type FhirResource = Readonly<Record<string, unknown>>

export type FhirBundle = {
  readonly resourceType: "Bundle"
  readonly type: "collection"
  readonly timestamp: string
  readonly entry: readonly { readonly fullUrl: string; readonly resource: FhirResource }[]
}

function fieldText(receipt: OrderReceipt, field: FieldName): string | null {
  const found = receipt.fields.find((entry: ReceiptField) => entry.field === field)
  return found === undefined ? null : String(found.value)
}

function integer(value: string | null): number | null {
  if (value === null) {
    return null
  }
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : null
}

function compact(record: Record<string, unknown>): FhirResource {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined))
}

function medicationRequest(receipt: OrderReceipt, id: string): FhirResource {
  const drug = [FieldName.DrugName, FieldName.Strength, FieldName.DosageForm]
    .map((field) => fieldText(receipt, field))
    .filter((part): part is string => part !== null)
    .join(" ")
  const npi = fieldText(receipt, FieldName.PrescriberNpi)
  const dea = fieldText(receipt, FieldName.PrescriberDea)
  const quantity = integer(fieldText(receipt, FieldName.Quantity))
  const refills = integer(fieldText(receipt, FieldName.Refills))
  const days = integer(fieldText(receipt, FieldName.DaysSupply))
  const route = fieldText(receipt, FieldName.Route)
  const sig = fieldText(receipt, FieldName.Sig)
  const identifiers = [
    ...(npi === null ? [] : [{ system: FHIR_NPI_SYSTEM, value: npi }]),
    ...(dea === null ? [] : [{ system: FHIR_DEA_SYSTEM, value: dea }]),
  ]
  return compact({
    resourceType: "MedicationRequest",
    id,
    status: "draft",
    intent: "order",
    identifier: [{ system: "urn:readback:order", value: receipt.orderId }],
    medicationCodeableConcept: { text: drug },
    subject: { display: fieldText(receipt, FieldName.PatientName) ?? "not recorded" },
    authoredOn: receipt.committedAt,
    requester: identifiers.length === 0 ? undefined : { identifier: identifiers[0] },
    dosageInstruction: [
      compact({
        text: sig ?? undefined,
        route: route === null ? undefined : { text: route },
      }),
    ],
    dispenseRequest: compact({
      quantity: quantity === null ? undefined : { value: quantity },
      numberOfRepeatsAllowed: refills ?? undefined,
      expectedSupplyDuration:
        days === null
          ? undefined
          : { value: days, unit: "days", system: "http://unitsofmeasure.org", code: "d" },
    }),
    note: [
      {
        text: "synthetic data from a technology demonstration, not a medical device; awaiting pharmacist verification",
      },
    ],
  })
}

function provenance(receipt: OrderReceipt, targetId: string): FhirResource {
  return {
    resourceType: "Provenance",
    id: `${targetId}-provenance`,
    target: [{ reference: `MedicationRequest/${targetId}` }],
    recorded: receipt.committedAt,
    activity: {
      text: "verbal order taken by voice, each field proved by a validator or confirmed aloud",
    },
    agent: [{ who: { display: "Readback intake gate" } }],
    entity: [
      {
        role: "source",
        what: {
          identifier: { system: "urn:readback:receipt-sha256", value: receipt.sha256 },
          display: "the canonical receipt this request was derived from",
        },
      },
      ...receipt.fields.map((field) => ({
        role: "source",
        what: {
          display: `${field.field}: words ${field.provenance.startMs}-${field.provenance.endMs} ms of turn ${field.provenance.turnOrder}, min confidence ${field.provenance.minConfidence}, ${field.confirmationMode}, validator ${field.verdict.validatorName} ${field.verdict.outcome}`,
        },
      })),
    ],
  }
}

export function fhirBundleFor(receipt: OrderReceipt): FhirBundle {
  const id = receipt.orderId.replace(/[^A-Za-z0-9.-]/g, "-").slice(0, 64)
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: receipt.committedAt,
    entry: [
      { fullUrl: `urn:uuid:${id}`, resource: medicationRequest(receipt, id) },
      { fullUrl: `urn:uuid:${id}-provenance`, resource: provenance(receipt, id) },
    ],
  }
}
