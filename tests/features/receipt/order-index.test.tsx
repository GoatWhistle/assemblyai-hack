import { render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"
import { NO_RECEIPT_CODE } from "@/domain"
import { CALL_HREF, REPLAY_ENTRY_HREF } from "@/features/judge-demo/entry-routes"
import { FILE_CHECK_LABEL, NO_RECEIPT_TITLE, OrderCheck } from "@/features/receipt/order-check"
import { OrderPageView } from "@/features/receipt/order-page"

const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
})

describe("r2-A1 A1r2-05: the receipt file check has its own page", () => {
  it("fetches nothing and offers the file check when no session is named", () => {
    const fetcher = vi.fn()
    globalThis.fetch = fetcher as unknown as typeof fetch
    render(<OrderPageView sessionId={null} />)
    expect(fetcher).not.toHaveBeenCalled()
    expect(screen.getByLabelText(FILE_CHECK_LABEL)).toBeTruthy()
    expect(screen.queryByText(/fetching the receipt/i)).toBeNull()
    expect(screen.getByRole("link", { name: /skip to the receipt/i })).toBeTruthy()
  })
})

describe("r2-A3 A3R2-09: a session with no receipt is an empty state with a way on", () => {
  it("names the case neutrally, raises no alert and offers the replay and a call", async () => {
    globalThis.fetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "no committed order", code: NO_RECEIPT_CODE }), {
          status: 404,
        }),
    ) as unknown as typeof fetch
    render(<OrderCheck sessionId="srv-0" />)
    await waitFor(() => expect(screen.getByText(NO_RECEIPT_TITLE)).toBeTruthy())
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("link", { name: "Watch the replay" }).getAttribute("href")).toBe(
      REPLAY_ENTRY_HREF,
    )
    expect(screen.getByRole("link", { name: "Start a call" }).getAttribute("href")).toBe(
      CALL_HREF,
    )
    expect(screen.getByLabelText(FILE_CHECK_LABEL)).toBeTruthy()
  })
})
