import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { FieldName, SpellOutStyle } from "@/domain"
import { fastPathFor } from "@/features/read-back/fast-path"
import { initialContext, ReadBackState } from "@/features/read-back/read-back-machine"
import { ReadBackPanel } from "@/features/read-back/read-back-panel"

describe("ReadBackPanel", () => {
  it("has a designed empty state when nothing is in flight", () => {
    render(<ReadBackPanel context={initialContext()} />)
    expect(screen.getByText("No read-back in flight")).toBeDefined()
  })

  it("shows the phrase the agent said while awaiting an answer", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.AwaitingConfirmation,
          field: FieldName.Quantity,
          utterance: "Confirming quantity: 30. Correct?",
          attempts: 1,
        })}
      />,
    )
    expect(screen.getByText("Confirming quantity: 30. Correct?")).toBeDefined()
    expect(screen.getByRole("status").textContent).toContain("Quantity")
  })

  it("shows both sides of the exchange once the caller has answered", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.Matched,
          field: FieldName.Quantity,
          utterance: "Confirming quantity: 30. Correct?",
          heard: "Yes, thirty.",
          attempts: 1,
        })}
      />,
    )
    expect(screen.getByText("Yes, thirty.")).toBeDefined()
    expect(screen.getByText("The caller answered")).toBeDefined()
  })

  it("marks a locally answered confirmation as local, so it never reads as the server's own write", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.Matched,
          field: FieldName.Quantity,
          utterance: "Confirming quantity: 30. Correct?",
          heard: "Yes, thirty.",
          attempts: 1,
        })}
        fastPath={fastPathFor(ReadBackState.AwaitingConfirmation, "Yes, thirty.")}
      />,
    )
    expect(
      screen.getByText(/answered locally, no model round trip/i),
      "the fast path is optimistic display only; the label must say where the verdict came from",
    ).toBeDefined()
    expect(
      screen.getByText(/the server still decides whether the value is written/i),
      "a local yes that read as a completed write would be a screen lying about the order",
    ).toBeDefined()
  })

  it("does not show the local-verdict note when no local answer was recognised", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.AwaitingConfirmation,
          field: FieldName.Quantity,
          utterance: "Confirming quantity: 30. Correct?",
          attempts: 1,
        })}
      />,
    )
    expect(screen.queryByText(/answered locally/i)).toBeNull()
  })

  it("renders the NATO spelling when spell-out is entered for a letter field", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.SpellOut,
          field: FieldName.PrescriberDea,
          expectedValue: "AB1",
          utterance: "Please read it back one character at a time.",
          spellOutStyle: SpellOutStyle.Nato,
          attempts: 3,
        })}
      />,
    )
    expect(screen.getByText("Alfa")).toBeDefined()
    expect(screen.getByText("Bravo")).toBeDefined()
    expect(screen.getByText("one")).toBeDefined()
  })

  it("renders digit-by-digit spelling for a numeric field", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.SpellOut,
          field: FieldName.PrescriberNpi,
          expectedValue: "124",
          utterance: "One digit at a time, please.",
          spellOutStyle: SpellOutStyle.Digits,
          attempts: 2,
        })}
      />,
    )
    expect(screen.getByText("two")).toBeDefined()
    expect(screen.getByText(/digit by digit/i)).toBeDefined()
  })

  it("shows the escalated state as its own terminal outcome", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.Escalated,
          field: FieldName.DrugName,
          utterance: "I am bringing a pharmacist onto the line.",
          attempts: 4,
        })}
      />,
    )
    expect(screen.getByRole("status").textContent).toContain("Handed to a pharmacist")
  })

  it("reports the attempt count against the budget", () => {
    render(
      <ReadBackPanel
        context={initialContext({
          state: ReadBackState.AwaitingConfirmation,
          field: FieldName.DrugName,
          utterance: "x",
          attempts: 2,
          maxAttempts: 3,
        })}
      />,
    )
    expect(screen.getByText(/attempt 2 of 3/i)).toBeDefined()
  })

  it("keys the fast-path note by field and attempt, so its entrance motion retriggers on the next confirmation", () => {
    const source = readFileSync("src/features/read-back/read-back-panel/index.tsx", "utf8")
    const localNoteBlock = source.slice(
      source.indexOf("styles.localNote") - 200,
      source.indexOf("styles.localNote"),
    )
    const localNoteTag = localNoteBlock.match(
      /key=\{`\$\{context\.field\}:\$\{context\.attempts\}`\}/,
    )
    expect(
      localNoteTag,
      "the fast-path yes/no is answered locally on every confirmation in a live call; without a key tied to field and attempt, two consecutive fast-path answers render the same className on the same DOM node, so the settle animation plays once and never again after the first confirmed field",
    ).not.toBeNull()
  })
})
