import { afterEach, beforeAll } from "vitest"

beforeAll(() => {
  process.env.TZ = "UTC"
})

afterEach(() => {
  if (typeof globalThis.document !== "undefined") {
    globalThis.document.body.replaceChildren()
  }
})
