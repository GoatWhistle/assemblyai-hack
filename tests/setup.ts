import { cleanup } from "@testing-library/react"
import { afterEach, beforeAll } from "vitest"

export const PAID_CREDENTIAL_VARS = [
  "ASSEMBLYAI_API_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "AGENT_TOOL_SECRET",
] as const

for (const name of PAID_CREDENTIAL_VARS) {
  delete process.env[name]
}

beforeAll(() => {
  process.env.TZ = "UTC"
})

afterEach(() => {
  if (typeof globalThis.document === "undefined") {
    return
  }
  cleanup()
  globalThis.document.body.replaceChildren()
})
