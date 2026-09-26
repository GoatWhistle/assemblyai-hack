import { describe, expect, it } from "vitest"
import { MicKeyAction, micKeyAction } from "@/features/microphone/use-mic-keys"

describe("micKeyAction", () => {
  it("starts on space when idle and leaves space alone once the line is open", () => {
    expect(micKeyAction(" ", "Space", { busy: false, open: false })).toBe(MicKeyAction.Start)
    expect(micKeyAction(" ", "Space", { busy: false, open: true })).toBe(MicKeyAction.Ignore)
  })

  it("stops on escape while the line is still opening", () => {
    expect(
      micKeyAction("Escape", "Escape", { busy: true, open: false, cancellable: true }),
    ).toBe(MicKeyAction.Stop)
  })

  it("ignores space while the line is opening or closing", () => {
    expect(micKeyAction(" ", "Space", { busy: true, open: false })).toBe(MicKeyAction.Ignore)
    expect(micKeyAction(" ", "Space", { busy: true, open: true })).toBe(MicKeyAction.Ignore)
  })

  it("stops on escape only when the line is open", () => {
    expect(micKeyAction("Escape", "Escape", { busy: false, open: true })).toBe(
      MicKeyAction.Stop,
    )
    expect(micKeyAction("Escape", "Escape", { busy: false, open: false })).toBe(
      MicKeyAction.Ignore,
    )
  })

  it("ignores every other key", () => {
    for (const key of ["a", "Enter", "Tab", "ArrowUp"]) {
      expect(micKeyAction(key, `Key${key}`, { busy: false, open: true })).toBe(
        MicKeyAction.Ignore,
      )
    }
  })
})
