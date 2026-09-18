import { describe, expect, it } from "vitest"
import { ARGUMENT_REFUSED, argumentRefusal, fitsToolLimit } from "@/tools"

const FIELD_MESSAGE = "Invalid enum value. Expected 'drug_name' | 'strength'"
const VALUE_MESSAGE = "String must contain at least 1 character(s)"

const issues = [
  { path: ["field"], message: FIELD_MESSAGE },
  { path: ["value"], message: VALUE_MESSAGE },
]

describe("the refusal an agent reads when its arguments are wrong", () => {
  it("carries a stable machine code, so the agent can branch on it rather than parse prose", () => {
    expect(
      argumentRefusal(issues).code,
      "an untyped error string forces the model to guess whether a retry is appropriate",
    ).toBe(ARGUMENT_REFUSED)
  })

  it("states that nothing was written, because a rejected call must not read as a partial success", () => {
    expect(
      argumentRefusal(issues).written_to_order,
      "the whole product claim is that a value cannot enter the order without proof; a refusal that is silent about this invites the agent to assume the write happened",
    ).toBe(false)
  })

  it("names every rejected argument, not only the first one", () => {
    const payload = argumentRefusal(issues)
    expect(
      payload.rejected_arguments,
      "reporting one issue at a time turns a two-field mistake into two extra round trips on a live call",
    ).toEqual([
      { argument: "field", problem: FIELD_MESSAGE },
      { argument: "value", problem: VALUE_MESSAGE },
    ])
  })

  it("tells the agent what to do next, which is the difference between an error and a correction", () => {
    expect(
      String(argumentRefusal(issues).how_to_fix),
      "the refusal must forbid proceeding to commit_order, otherwise a rejected field can still reach the write attempt",
    ).toContain("commit_order")
  })

  it("says nothing to the caller, because a schema mistake is the agent's fault and not the caller's", () => {
    expect(
      argumentRefusal(issues).say_to_caller,
      "reading a validation error aloud would make our own bug sound like the caller mis-spoke",
    ).toBeNull()
  })

  it("labels the root when the failure is the whole body rather than one argument", () => {
    const payload = argumentRefusal([{ path: [], message: "Expected object, received string" }])
    const named = payload.rejected_arguments as readonly { argument: string }[]
    expect(
      named.map((entry) => entry.argument),
      "an empty path rendered as an empty string would print a blank argument name",
    ).toEqual(["(root)"])
  })

  it("stays inside the 8 KiB AssemblyAI truncates at, even with many issues", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      path: [`field_${i}`],
      message: "Invalid value supplied for this argument",
    }))
    expect(
      fitsToolLimit(argumentRefusal(many)),
      "a refusal truncated mid-JSON is unparseable, so the agent would see no code at all",
    ).toBe(true)
  })

  it("reports how many issues it left out, so a cap cannot read as a complete list", () => {
    const many = Array.from({ length: 200 }, (_, i) => ({
      path: [`field_${i}`],
      message: "Invalid value supplied for this argument",
    }))
    const payload = argumentRefusal(many)
    expect(
      payload.omitted_argument_count,
      "silently dropping issues to fit the byte limit would let the agent believe it had fixed everything after correcting ten",
    ).toBe(190)
  })

  it("omits nothing when the issues already fit, so the count is zero rather than absent", () => {
    expect(
      argumentRefusal(issues).omitted_argument_count,
      "an absent count and a zero count must not be the same value, per absence never reading as success",
    ).toBe(0)
  })
})
