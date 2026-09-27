import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { Command, copyCommandLabel } from "@/shared/ui/data-display/command"
import {
  COPIED_NOTE,
  COPY_FAILED_NOTE,
  COPY_RESET_MS,
  CopyButton,
} from "@/shared/ui/primitives/copy-button"

const COMMAND = "npx tsx scripts/measure/ismp-coverage.ts"

function stubClipboard(writeText: (value: string) => Promise<void>) {
  Object.defineProperty(globalThis.navigator, "clipboard", {
    value: { writeText },
    configurable: true,
  })
}

afterEach(() => {
  vi.useRealTimers()
  Reflect.deleteProperty(globalThis.navigator, "clipboard")
})

describe("the copy button", () => {
  it("writes the value to the clipboard and announces it in a polite status region", async () => {
    const writeText = vi.fn(async () => undefined)
    stubClipboard(writeText)
    render(<CopyButton value={COMMAND} label="Copy command" />)
    const status = screen.getByRole("status")
    expect(status.textContent).toBe("")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }))
    })
    expect(writeText).toHaveBeenCalledWith(COMMAND)
    expect(status.textContent).toBe(COPIED_NOTE)
    expect(screen.getByRole("button").getAttribute("data-state")).toBe("copied")
  })

  it("marks its wrapper with the copy state, so a hover-revealed button stays shown while it confirms", async () => {
    vi.useFakeTimers()
    stubClipboard(async () => undefined)
    render(<CopyButton value={COMMAND} label="Copy command" className="slot" />)
    const wrap = screen.getByRole("button").parentElement
    expect(wrap?.classList.contains("slot")).toBe(true)
    expect(wrap?.getAttribute("data-state")).toBe("idle")
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    expect(wrap?.getAttribute("data-state")).toBe("copied")
    act(() => {
      vi.advanceTimersByTime(COPY_RESET_MS)
    })
    expect(wrap?.getAttribute("data-state")).toBe("idle")
  })

  it("returns to its resting state after the confirmation has been read", async () => {
    vi.useFakeTimers()
    stubClipboard(async () => undefined)
    render(<CopyButton value={COMMAND} label="Copy command" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    expect(screen.getByRole("status").textContent).toBe(COPIED_NOTE)
    act(() => {
      vi.advanceTimersByTime(COPY_RESET_MS)
    })
    expect(screen.getByRole("status").textContent).toBe("")
  })

  it("says the copy failed, and what to do instead, when the clipboard refuses", async () => {
    stubClipboard(async () => {
      throw new Error("denied")
    })
    render(<CopyButton value={COMMAND} label="Copy command" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    expect(screen.getByRole("status").textContent).toBe(COPY_FAILED_NOTE)
  })

  it("works from the keyboard", async () => {
    const user = userEvent.setup()
    render(<CopyButton value={COMMAND} label="Copy command" />)
    await user.tab()
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Copy command" }))
    await user.keyboard("{Enter}")
    expect(await navigator.clipboard.readText()).toBe(COMMAND)
    expect(screen.getByRole("status").textContent).toBe(COPIED_NOTE)
  })
})

describe("a shell command shown on a page", () => {
  it("shows the command as code beside a copy button named after it", () => {
    render(<Command value={COMMAND} />)
    expect(screen.getByText(COMMAND).tagName).toBe("CODE")
    expect(screen.getByRole("button", { name: copyCommandLabel(COMMAND) })).toBeDefined()
    expect(copyCommandLabel(COMMAND)).toContain(COMMAND)
  })

  it("lets a tap on the code focus the command, which reveals the copy button on a touch screen, without adding a tab stop", async () => {
    const user = userEvent.setup()
    render(<Command value={COMMAND} />)
    const code = screen.getByText(COMMAND)
    expect(code.getAttribute("tabindex")).toBe("-1")
    await user.tab()
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: copyCommandLabel(COMMAND) }),
    )
  })
})
