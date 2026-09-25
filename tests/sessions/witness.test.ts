import { describe, expect, it } from "vitest"
import { FieldName } from "@/domain"
import {
  parseTimeline,
  type SessionTimeline,
  vendorUserTranscripts,
  witnessOrderFields,
} from "@/sessions"
import recorded from "../../eval/fixtures/witness/timeline-recorded-shape.json"

const timeline = parseTimeline(recorded) as SessionTimeline

function spoken(...texts: string[]): SessionTimeline {
  return { turns: texts.map((text) => ({ user_transcript: text, status: "completed" })) }
}

describe("S2: the vendor's own timeline witnesses the values the browser reported", () => {
  it("parses the timeline recorded from a real agent session", () => {
    expect(timeline).not.toBeNull()
    expect(timeline.session_id).toMatch(/^sess_/)
    expect(vendorUserTranscripts([timeline])).toEqual(["Hydromorphone."])
  })

  it("witnesses a drug name the vendor's recognizer also heard", () => {
    const [witness] = witnessOrderFields(
      [{ field: FieldName.DrugName, value: "hydromorphone" }],
      [timeline],
    )
    expect(witness?.verdict).toBe("witnessed")
    expect(witness?.vendorTranscript).toBe("Hydromorphone.")
  })

  it("does not witness a browser-posted turn the vendor never heard, even its LASA partner", () => {
    const [witness] = witnessOrderFields(
      [{ field: FieldName.DrugName, value: "morphine" }],
      [timeline],
    )
    expect(witness?.verdict).toBe("not_witnessed")
    expect(witness?.detail).toContain("none of the 1 caller turns")
  })

  it("does not witness a value when the vendor's timeline holds no caller speech at all", () => {
    const [witness] = witnessOrderFields(
      [{ field: FieldName.PrescriberNpi, value: "1245319599" }],
      [{}],
    )
    expect(witness?.verdict).toBe("not_witnessed")
    expect(witness?.vendorTranscript).toBeNull()
  })

  it("witnesses an identifier the vendor split across two adjacent caller turns", () => {
    const [witness] = witnessOrderFields(
      [{ field: FieldName.PrescriberNpi, value: "1245319599" }],
      [spoken("the NPI is 12453", "19599")],
    )
    expect(witness?.verdict).toBe("witnessed")
  })

  it("does not join non-adjacent turns into support", () => {
    const [witness] = witnessOrderFields(
      [{ field: FieldName.PrescriberNpi, value: "1245319599" }],
      [spoken("12453", "no wait", "19599")],
    )
    expect(witness?.verdict).toBe("not_witnessed")
  })

  it("reads every field on its own, so one unwitnessed field does not taint the others", () => {
    const verdicts = witnessOrderFields(
      [
        { field: FieldName.DrugName, value: "hydromorphone" },
        { field: FieldName.Quantity, value: 30 },
      ],
      [spoken("hydromorphone two milligrams")],
    ).map((witness) => [witness.field, witness.verdict])
    expect(verdicts).toEqual([
      [FieldName.DrugName, "witnessed"],
      [FieldName.Quantity, "not_witnessed"],
    ])
  })
})
