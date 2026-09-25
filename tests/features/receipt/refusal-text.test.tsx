import { render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NO_RECEIPT_CODE } from "@/domain"
import { FaultPanel } from "@/features/intake/intake-screen/fault-panel"
import { FAULT_COPY, SessionFault } from "@/features/intake/session-status"
import { loadReceipt, sentence } from "@/features/receipt/load-receipt"
import { ErrorState } from "@/shared/ui/states/error-state"

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("AU4: a receipt refusal reads as a sentence", () => {
  it("capitalises and closes the server's lower-case refusal", () => {
    expect(sentence("session x has no committed order")).toBe(
      "Session x has no committed order.",
    )
    expect(sentence("Already fine.")).toBe("Already fine.")
    expect(sentence("")).toBe("")
  })

  it("applies it on the product path, to what the receipt route answered", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              error: "session no-such-session has no committed order, so there is no receipt",
              code: NO_RECEIPT_CODE,
            }),
            { status: 404 },
          ),
      ),
    )
    const load = await loadReceipt("no-such-session")
    expect(load.state).toBe("missing")
    expect(load.state === "missing" ? load.message : "").toBe(
      "Session no-such-session has no committed order, so there is no receipt.",
    )
  })
})

describe("AU4: fault titles are headings", () => {
  it("renders an error state's title as a heading, level two by default", () => {
    render(<ErrorState title="Something refused" body="Because." />)
    expect(screen.getByRole("heading", { level: 2, name: "Something refused" })).toBeTruthy()
  })

  it("gives a live-call fault panel a heading a screen reader can jump to", () => {
    render(<FaultPanel fault={SessionFault.TokenFailed} />)
    expect(
      screen.getByRole("heading", { name: FAULT_COPY[SessionFault.TokenFailed].title }),
    ).toBeTruthy()
  })
})
