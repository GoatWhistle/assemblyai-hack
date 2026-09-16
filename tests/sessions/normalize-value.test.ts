import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import { normalizeFieldValue, normalizeInteger, normalizeStrength } from "@/sessions"

describe("value normalization", () => {
  it("turns spoken integers into numbers", () => {
    expect(normalizeInteger("thirty")).toBe(30)
    expect(normalizeInteger("30")).toBe(30)
    expect(normalizeInteger("ninety")).toBe(90)
    expect(normalizeInteger("twenty one")).toBe(21)
  })

  it("refuses a quantity it cannot put in standard form", () => {
    expect(normalizeInteger("a month's worth")).toBeNull()
    expect(normalizeFieldValue(FieldName.Quantity, "a month's worth")).toBeNull()
  })

  it("reads no refills as zero", () => {
    expect(normalizeFieldValue(FieldName.Refills, "no refills")).toBe(0)
    expect(normalizeFieldValue(FieldName.Refills, "none")).toBe(0)
  })

  it("normalizes a strength to a number and a unit", () => {
    expect(normalizeStrength("10 mg")).toBe("10 mg")
    expect(normalizeStrength("ten milligrams")).toBe("10 mg")
    expect(normalizeStrength("point five milligrams")).toBe("0.5 mg")
    expect(normalizeStrength("50 micrograms")).toBe("50 mcg")
  })

  it("refuses a strength with no unit", () => {
    expect(normalizeStrength("a lot")).toBeNull()
  })

  it("reads the catalogue per unit strength form", () => {
    expect(normalizeStrength("10 mg/1")).toBe("10 mg")
    expect(normalizeStrength("500 mg/1")).toBe("500 mg")
  })

  it("keeps a real denominator rather than dropping it", () => {
    expect(normalizeStrength("200 mg/5mL")).toBe("200 mg/5ml")
    expect(normalizeStrength("50 mg/mL")).toBe("50 mg/ml")
  })

  it("normalizes an npi and a dea", () => {
    expect(normalizeFieldValue(FieldName.PrescriberNpi, "1-245-319-599")).toBe("1245319599")
    expect(normalizeFieldValue(FieldName.PrescriberDea, "ab1234563")).toBe("AB1234563")
    expect(normalizeFieldValue(FieldName.PrescriberNpi, "12345")).toBeNull()
  })

  it("title cases a patient name", () => {
    expect(normalizeFieldValue(FieldName.PatientName, "jane   doe")).toBe("Jane Doe")
    expect(normalizeFieldValue(FieldName.PatientName, "JANE DOE")).toBe("Jane Doe")
  })

  it("lowercases a drug name and uppercases form and route", () => {
    expect(normalizeFieldValue(FieldName.DrugName, "Lisinopril")).toBe("lisinopril")
    expect(normalizeFieldValue(FieldName.DosageForm, "tablet")).toBe("TABLET")
    expect(normalizeFieldValue(FieldName.Route, "oral")).toBe("ORAL")
  })

  it("returns null for an empty value on any field", () => {
    for (const field of Object.values(FieldName)) {
      expect(normalizeFieldValue(field, "   "), field).toBeNull()
    }
  })
})
