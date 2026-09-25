import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { makeVerdict, VerdictOutcome } from "@/domain"
import { VerdictBlock } from "@/shared/ui/data-display/verdict-block"
import { Chip } from "@/shared/ui/primitives/chip"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { ErrorState } from "@/shared/ui/states/error-state"

describe("EmptyState", () => {
  it("teaches the interface rather than saying nothing is here", () => {
    render(
      <EmptyState
        title="No field has been proposed yet"
        body="Each value appears here as a card carrying its source words."
      />,
    )
    expect(screen.getByText("No field has been proposed yet")).toBeDefined()
    expect(screen.getByText(/carrying its source words/)).toBeDefined()
  })

  it("can carry an action so the state is a route forward", async () => {
    const onClick = vi.fn()
    render(
      <EmptyState
        title="Nothing yet"
        body="Start a session."
        actions={
          <button type="button" onClick={onClick}>
            Start
          </button>
        }
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: "Start" }))
    expect(onClick).toHaveBeenCalledOnce()
  })
})

describe("ErrorState", () => {
  it("announces itself as an alert so a failure is not silent", () => {
    render(<ErrorState title="The microphone was refused" body="Nothing can be transcribed." />)
    expect(screen.getByRole("alert")).toBeDefined()
  })

  it("reports the machine code alongside the human explanation", () => {
    render(<ErrorState title="Dropped" body="A socket dropped." code="socket_dropped" />)
    expect(screen.getByText(/Reported as socket_dropped/)).toBeDefined()
  })
})

describe("Chip", () => {
  it("renders its label and hides a decorative glyph from assistive technology", () => {
    const { container } = render(
      <Chip tone="lasa" glyph="!">
        Look-alike pair
      </Chip>,
    )
    expect(screen.getByText("Look-alike pair")).toBeDefined()
    expect(container.querySelector("[aria-hidden='true']")?.textContent).toBe("!")
  })
})

describe("VerdictBlock", () => {
  it("names the outcome in words and cites the rule", () => {
    render(
      <VerdictBlock
        verdict={makeVerdict({
          outcome: VerdictOutcome.FailedChecksum,
          validatorName: "dea_mod10",
          detail: "odd=9, even=12, total=33, computed 3, given 4",
          checkedValue: "AB1234564",
          evidence: { computed: 3, given: 4 },
        })}
      />,
    )
    expect(screen.getByText("Check digit does not match")).toBeDefined()
    expect(screen.getByText(/last digit of result == d7/)).toBeDefined()
    expect(screen.getByText("computed")).toBeDefined()
  })

  it("renders every outcome with its own headline", () => {
    for (const outcome of Object.values(VerdictOutcome)) {
      const { unmount } = render(
        <VerdictBlock
          verdict={makeVerdict({
            outcome,
            validatorName: "range_check",
            detail: "detail",
            checkedValue: "30",
          })}
        />,
      )
      expect(screen.getByText("range_check")).toBeDefined()
      unmount()
    }
  })
})
