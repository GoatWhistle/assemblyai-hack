import { describe, expect, it, vi } from "vitest"
import { CaptureUnavailableError, loadCaptureModule } from "@/audio/microphone"

describe("a capture processor that never loads ends in an error, never in a hang", () => {
  it("rejects with CaptureUnavailableError when addModule never settles", async () => {
    vi.useFakeTimers()
    const pending = loadCaptureModule(
      { addModule: () => new Promise<void>(() => undefined) },
      5000,
    )
    const assertion = expect(pending).rejects.toBeInstanceOf(CaptureUnavailableError)
    await vi.advanceTimersByTimeAsync(5000)
    await assertion
    vi.useRealTimers()
  })

  it("resolves when the module loads in time", async () => {
    await expect(
      loadCaptureModule({ addModule: async () => undefined }, 5000),
    ).resolves.toBeUndefined()
  })

  it("passes a real loading error through unchanged", async () => {
    const failure = new Error("AbortError: Unable to load a worklet's module")
    await expect(
      loadCaptureModule({ addModule: () => Promise.reject(failure) }, 5000),
    ).rejects.toBe(failure)
  })
})
