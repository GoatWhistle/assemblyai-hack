import { describe, expect, it } from "vitest"
import { SessionStorageError } from "@/domain"
import { chooseSessionStore } from "@/sessions"

const client = {
  put: async () => ({ url: "https://blob.example.com/sessions/live/s1.json" }),
  list: async () => ({ blobs: [] }),
}

describe("choosing where a finished session is stored", () => {
  it("uses blob storage whenever a token is configured", () => {
    const store = chooseSessionStore({ BLOB_READ_WRITE_TOKEN: "vercel-blob-token" }, client)
    expect(store.backend(), "a configured token must produce durable storage, not memory").toBe(
      "blob",
    )
  })

  it("treats a blank token as absent rather than as a configured value", () => {
    const store = chooseSessionStore(
      { BLOB_READ_WRITE_TOKEN: "   ", NODE_ENV: "development" },
      client,
    )
    expect(
      store.backend(),
      "a whitespace token is not a credential; reading it as one would send writes to an unauthenticated call",
    ).toBe("memory")
  })

  it("refuses to run in production with no blob token, because a lost session would read as a successful commit", () => {
    expect(
      () => chooseSessionStore({ NODE_ENV: "production" }, client),
      "silently falling back to memory in production is the absence-reads-as-success defect: commitOrder would report success and the order would vanish with the function",
    ).toThrow(SessionStorageError)
  })

  it("names the missing variable in the refusal so the operator can act on it", () => {
    expect(
      () => chooseSessionStore({ NODE_ENV: "production" }, client),
      "a refusal that does not name BLOB_READ_WRITE_TOKEN costs an hour of guessing",
    ).toThrow(/BLOB_READ_WRITE_TOKEN/)
  })

  it("falls back to memory outside production, so local development needs no blob account", () => {
    const store = chooseSessionStore({ NODE_ENV: "development" }, client)
    expect(
      store.backend(),
      "requiring a blob token for next dev would make the project unrunnable locally",
    ).toBe("memory")
  })

  it("allows an explicit opt-in to memory in production, so the escape hatch is deliberate and visible", () => {
    const store = chooseSessionStore(
      { NODE_ENV: "production", READBACK_ALLOW_MEMORY_STORE: "1" },
      client,
    )
    expect(
      store.backend(),
      "the override must be an explicit environment flag, never the default, so that choosing it is a recorded decision",
    ).toBe("memory")
  })
})
