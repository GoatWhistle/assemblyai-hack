import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { makeWordSpan } from "@/domain"
import { TranscriptView } from "@/features/transcript-view"
import {
  agentEntry,
  callerEntry,
  isWordSelected,
} from "@/features/transcript-view/transcript-entry"

const words = [
  makeWordSpan({ text: "Bisoprolol", startMs: 6800, endMs: 7620, confidence: 0.99 }),
  makeWordSpan({ text: "ten", startMs: 7640, endMs: 7860, confidence: 0.72 }),
]

const entries = [
  agentEntry({ id: "a0", text: "Who is the patient?", receivedAtMs: 400 }),
  callerEntry({
    id: "c0",
    text: "Bisoprolol ten",
    turnOrder: 2,
    words,
    receivedAtMs: 8400,
  }),
]

describe("TranscriptView", () => {
  it("has a designed empty state that explains the two-way highlighting", () => {
    render(<TranscriptView entries={[]} selection={null} />)
    expect(screen.getByText("Nothing has been said yet")).toBeDefined()
    expect(screen.getByText(/Selecting a field highlights the exact words/i)).toBeDefined()
  })

  it("separates the agent from the caller", () => {
    render(<TranscriptView entries={entries} selection={null} />)
    expect(screen.getByText("Agent")).toBeDefined()
    expect(screen.getByText("Caller")).toBeDefined()
  })

  it("renders each caller word as its own control so a span can be picked", () => {
    render(<TranscriptView entries={entries} selection={null} />)
    expect(screen.getByRole("button", { name: /Bisoprolol/i })).toBeDefined()
    expect(screen.getByRole("button", { name: /ten/i })).toBeDefined()
  })

  it("reports the clicked word and the turn it came from", async () => {
    const onSelectWord = vi.fn()
    render(<TranscriptView entries={entries} selection={null} onSelectWord={onSelectWord} />)
    await userEvent.click(screen.getByRole("button", { name: /Bisoprolol/i }))
    expect(onSelectWord).toHaveBeenCalledOnce()
    expect(onSelectWord.mock.calls[0]?.[0]).toMatchObject({ startMs: 6800 })
    expect(onSelectWord.mock.calls[0]?.[1]).toMatchObject({ id: "c0" })
  })

  it("exposes the millisecond span and certainty of each word on hover", () => {
    render(<TranscriptView entries={entries} selection={null} />)
    const button = screen.getByRole("button", { name: /Bisoprolol/i })
    expect(button.getAttribute("title")).toContain("6800-7620 ms")
    expect(button.getAttribute("title")).toContain("0.99")
  })

  it("shows a discarded echo turn as struck through with the reason stated", () => {
    render(
      <TranscriptView
        entries={[
          callerEntry({
            id: "c1",
            text: "Confirming quantity thirty",
            turnOrder: 3,
            words: [],
            receivedAtMs: 12800,
            discarded: true,
            discardReason: "Discarded as the agent's own voice during playback.",
          }),
        ]}
        selection={null}
      />,
    )
    expect(screen.getByText(/Discarded as the agent's own voice/i)).toBeDefined()
  })
})

describe("TranscriptView under a long session", () => {
  function manyEntries(count: number) {
    return Array.from({ length: count }, (_, index) =>
      callerEntry({
        id: `c${index}`,
        text: `turn ${index} lisinopril ten milligrams`,
        turnOrder: index,
        words: [],
        receivedAtMs: index * 1000,
      }),
    )
  }

  function sizeScroller(element: HTMLElement, scrollHeight: number, clientHeight: number) {
    Object.defineProperty(element, "scrollHeight", { value: scrollHeight, configurable: true })
    Object.defineProperty(element, "clientHeight", { value: clientHeight, configurable: true })
  }

  it("follows the newest turn instead of freezing at the first one", () => {
    const { container, rerender } = render(
      <TranscriptView entries={manyEntries(50)} selection={null} />,
    )
    const view = container.firstElementChild as HTMLElement
    expect(view).not.toBeNull()
    sizeScroller(view, 2512, 512)
    rerender(<TranscriptView entries={manyEntries(51)} selection={null} />)
    expect(
      view.scrollTop,
      "the newest turn stays below the fold and a live session looks frozen",
    ).toBe(2512)
  })

  it("stops following once the reader has scrolled up into the history", () => {
    const { container, rerender } = render(
      <TranscriptView entries={manyEntries(50)} selection={null} />,
    )
    const view = container.firstElementChild as HTMLElement
    sizeScroller(view, 2512, 512)
    view.scrollTop = 200
    view.dispatchEvent(new Event("scroll", { bubbles: true }))
    rerender(<TranscriptView entries={manyEntries(51)} selection={null} />)
    expect(
      view.scrollTop,
      "yanking the reader to the bottom while they read history loses their place",
    ).toBe(200)
  })

  it("keeps the transcript container bounded rather than growing without limit", () => {
    const sheet = readFileSync("src/features/transcript-view/styles.module.css", "utf8")
    expect(sheet).toMatch(/max-height:/)
    expect(sheet).toMatch(/overflow-y:\s*auto/)
  })
})

describe("isWordSelected", () => {
  it("is false when nothing is selected", () => {
    expect(isWordSelected(words[0] as never, null)).toBe(false)
  })

  it("is true for a word inside the selected span", () => {
    expect(isWordSelected(words[0] as never, { startMs: 6800, endMs: 7860 })).toBe(true)
  })

  it("is false for a word outside the selected span", () => {
    expect(isWordSelected(words[1] as never, { startMs: 6800, endMs: 7620 })).toBe(false)
  })
})
