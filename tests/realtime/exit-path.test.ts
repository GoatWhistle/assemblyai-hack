import { afterEach, describe, expect, it, vi } from "vitest"
import { closeBothSockets, installExitPath } from "@/realtime/exit-path"

function fakeSocket() {
  const calls: number[] = []
  return {
    calls,
    end: async () => {
      calls.push(Date.now())
    },
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("closeBothSockets", () => {
  it("ends both sockets, because an unclosed stt socket lingers up to three hours", async () => {
    const stt = fakeSocket()
    const agent = fakeSocket()
    await closeBothSockets({ stt, agent })
    expect(stt.calls.length).toBe(1)
    expect(agent.calls.length).toBe(1)
  })

  it("still ends the other socket when one throws", async () => {
    const stt = fakeSocket()
    const errors: unknown[] = []
    await closeBothSockets(
      {
        stt,
        agent: {
          end: async () => {
            throw new Error("agent socket already gone")
          },
        },
      },
      { onError: (error) => errors.push(error) },
    )
    expect(stt.calls.length).toBe(1)
    expect(errors.length).toBe(1)
  })

  it("reports closing before closed so the interface can show the wait", async () => {
    const order: string[] = []
    await closeBothSockets(
      { stt: fakeSocket(), agent: fakeSocket() },
      { onClosing: () => order.push("closing"), onClosed: () => order.push("closed") },
    )
    expect(order).toEqual(["closing", "closed"])
  })

  it("tolerates a session that never opened", async () => {
    await expect(closeBothSockets({ stt: null, agent: null })).resolves.toBeUndefined()
  })
})

describe("installExitPath", () => {
  it("closes both sockets when the page goes away", async () => {
    const stt = fakeSocket()
    const agent = fakeSocket()
    const uninstall = installExitPath(() => ({ stt, agent }))
    globalThis.window.dispatchEvent(new Event("pagehide"))
    await vi.waitFor(() => {
      expect(stt.calls.length).toBe(1)
      expect(agent.calls.length).toBe(1)
    })
    uninstall()
  })

  it("fires only once even if the event repeats", async () => {
    const stt = fakeSocket()
    const uninstall = installExitPath(() => ({ stt, agent: null }))
    globalThis.window.dispatchEvent(new Event("pagehide"))
    globalThis.window.dispatchEvent(new Event("pagehide"))
    await vi.waitFor(() => expect(stt.calls.length).toBe(1))
    uninstall()
  })

  it("stops listening after the returned uninstall runs", async () => {
    const stt = fakeSocket()
    const uninstall = installExitPath(() => ({ stt, agent: null }))
    uninstall()
    globalThis.window.dispatchEvent(new Event("pagehide"))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(stt.calls.length).toBe(0)
  })

  it("does not close on a mere tab switch unless that is asked for", async () => {
    const stt = fakeSocket()
    const uninstall = installExitPath(() => ({ stt, agent: null }))
    globalThis.document.dispatchEvent(new Event("visibilitychange"))
    await new Promise((resolve) => setTimeout(resolve, 10))
    expect(stt.calls.length).toBe(0)
    uninstall()
  })

  it("resolves the sockets lazily, so a session started after install is still closed", async () => {
    let stt: ReturnType<typeof fakeSocket> | null = null
    const uninstall = installExitPath(() => ({ stt, agent: null }))
    stt = fakeSocket()
    globalThis.window.dispatchEvent(new Event("pagehide"))
    await vi.waitFor(() => expect(stt?.calls.length).toBe(1))
    uninstall()
  })
})
