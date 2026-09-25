import { describe, expect, it } from "vitest"
import { processSingleton } from "@/sessions"

describe("one in-memory store per process, not per route bundle", () => {
  it("returns the same instance for the same key on every call", () => {
    const first = processSingleton("test-shared", () => new Map<string, number>())
    first.set("seen", 1)
    const second = processSingleton("test-shared", () => new Map<string, number>())
    expect(second).toBe(first)
    expect(second.get("seen")).toBe(1)
  })

  it("keeps the registry on globalThis, where a separately bundled route module finds it", () => {
    processSingleton("test-global", () => "value")
    const registry: unknown = Reflect.get(globalThis, "__readbackProcessMemory")
    expect(registry).toBeInstanceOf(Map)
    expect((registry as Map<string, unknown>).get("test-global")).toBe("value")
  })
})
