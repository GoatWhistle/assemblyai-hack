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
