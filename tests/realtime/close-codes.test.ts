import { describe, expect, it } from "vitest"
import { CloseCode, explainClose, isAlertWorthy } from "@/realtime/close-codes"

describe("explainClose", () => {
  it("explains 3007 as malformed chunks and points at the chunk window", () => {
    const explanation = explainClose(CloseCode.MalformedChunks, "")
    expect(explanation.label).toBe("Malformed audio chunks")
    expect(explanation.explanation).toContain("50-1000 ms")
    expect(explanation.severity).toBe("warning")
  })

  it("explains 3008 as the three-hour cap and marks it alert-worthy", () => {
    const explanation = explainClose(CloseCode.ThreeHourCap, "")
    expect(explanation.severity).toBe("alert")
    expect(explanation.explanation).toContain("three hours")
  })

  it("explains 3009 as the session limit and names the five-per-minute rule", () => {
    const explanation = explainClose(CloseCode.SessionLimit, "")
    expect(explanation.severity).toBe("alert")
    expect(explanation.explanation).toContain("five new sessions per minute")
  })

  it("treats a clean close as normal", () => {
    expect(explainClose(1000, "").severity).toBe("normal")
    expect(explainClose(1001, "").severity).toBe("normal")
  })

  it("falls back for an undocumented code and says the reason field is truncated", () => {
    const explanation = explainClose(3011, "something happened")
    expect(explanation.label).toContain("3011")
    expect(explanation.explanation).toContain("something happened")
    expect(explanation.operatorAction).toContain("truncated")
  })
})

describe("isAlertWorthy", () => {
  it("is true only for the two codes that mean money was burned", () => {
    expect(isAlertWorthy(3008)).toBe(true)
    expect(isAlertWorthy(3009)).toBe(true)
    expect(isAlertWorthy(3007)).toBe(false)
    expect(isAlertWorthy(1000)).toBe(false)
  })
})
