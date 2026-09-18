import { afterEach, describe, expect, it, vi } from "vitest"
import { ToolAuthError } from "@/domain"
import {
  assertToolSecret,
  constantTimeEquals,
  MIN_TOOL_SECRET_CHARS,
  TOOL_SECRET_HEADER,
} from "@/tools"

const GOOD = "a-long-enough-shared-secret"

function headers(secret: string | null): Headers {
  const h = new Headers()
  if (secret !== null) {
    h.set(TOOL_SECRET_HEADER, secret)
  }
  return h
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("the shared tool secret is the only thing standing in front of the write path", () => {
  it("accepts the configured secret", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", GOOD)
    expect(() => assertToolSecret(headers(GOOD))).not.toThrow()
  })

  it("refuses a wrong secret of the same length", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", GOOD)
    const wrong = `${GOOD.slice(0, -1)}X`
    expect(wrong.length).toBe(GOOD.length)
    expect(() => assertToolSecret(headers(wrong))).toThrow(ToolAuthError)
  })

  it("refuses a missing header rather than treating absence as a match", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", GOOD)
    expect(() => assertToolSecret(headers(null))).toThrow(ToolAuthError)
  })

  it("refuses every request when the server has no secret configured", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", "")
    expect(() => assertToolSecret(headers(""))).toThrow(/no AGENT_TOOL_SECRET/)
    expect(() => assertToolSecret(headers("anything"))).toThrow(/no AGENT_TOOL_SECRET/)
  })

  it("refuses when the variable is whitespace, which is not the same as unset", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", "   ")
    expect(() => assertToolSecret(headers("   "))).toThrow(/no AGENT_TOOL_SECRET/)
  })

  it("refuses a secret too short to survive guessing, and says which side is wrong", () => {
    vi.stubEnv("AGENT_TOOL_SECRET", "short")
    expect(() => assertToolSecret(headers("short"))).toThrow(/too short/)
  })

  it("accepts a secret exactly at the minimum length", () => {
    const exact = "x".repeat(MIN_TOOL_SECRET_CHARS)
    vi.stubEnv("AGENT_TOOL_SECRET", exact)
    expect(() => assertToolSecret(headers(exact))).not.toThrow()
  })

  it("compares equal strings of unequal length without reading past either buffer", () => {
    expect(constantTimeEquals("abc", "abc")).toBe(true)
    expect(constantTimeEquals("abc", "abcd")).toBe(false)
    expect(constantTimeEquals("abcd", "abc")).toBe(false)
    expect(constantTimeEquals("", "")).toBe(true)
    expect(constantTimeEquals("", "a")).toBe(false)
  })

  it("compares over a fixed-width digest, so the loop length never depends on the secret", () => {
    const short = constantTimeEquals("a", "b")
    const long = constantTimeEquals("a".repeat(4096), "b")
    expect(short).toBe(false)
    expect(long).toBe(false)
  })

  it("treats a non-ascii secret by its bytes, not its code points", () => {
    const secret = "shared-secret-éè-long-enough"
    vi.stubEnv("AGENT_TOOL_SECRET", secret)
    expect(() => assertToolSecret(headers(secret))).not.toThrow()
    expect(() => assertToolSecret(headers(`${secret}x`))).toThrow(ToolAuthError)
  })
})
