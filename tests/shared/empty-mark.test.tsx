import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { EmptyMark, type EmptyMarkKind } from "@/shared/ui/states/empty-mark"
import { EmptyState } from "@/shared/ui/states/empty-state"

describe("the empty-state illustration", () => {
  it("is decoration a screen reader skips, for every kind", () => {
    for (const kind of ["words", "question", "receipt"] as EmptyMarkKind[]) {
      const { container, unmount } = render(<EmptyMark kind={kind} />)
      const svg = container.querySelector("svg")
      expect(svg?.getAttribute("aria-hidden"), kind).toBe("true")
      expect(svg?.getAttribute("focusable"), kind).toBe("false")
      unmount()
    }
  })

  it("replaces the glyph box when an empty state asks for one, keeping the words", () => {
    const { container } = render(
      <EmptyState
        illustration="words"
        title="Nothing has been said yet"
        body="Turns appear here as the recognizer finalises them."
      />,
    )
    expect(container.querySelector("svg[data-kind='words']")).not.toBeNull()
    expect(container.textContent).not.toContain("—")
    expect(screen.getByText("Nothing has been said yet")).toBeDefined()
  })

  it("keeps the glyph when no illustration is asked for", () => {
    const { container } = render(<EmptyState glyph="?" title="Nothing yet" body="Start." />)
    expect(container.querySelector("svg")).toBeNull()
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe("?")
  })
})
