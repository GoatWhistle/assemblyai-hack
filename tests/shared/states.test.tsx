import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { makeVerdict, VerdictOutcome } from "@/domain"
import { FigureWithMethod, NOT_MEASURED } from "@/shared/ui/data-display/figure-with-method"
import { VerdictBlock } from "@/shared/ui/data-display/verdict-block"
import { Toggle } from "@/shared/ui/forms/toggle"
import { Dialog } from "@/shared/ui/overlays/dialog"
import { Chip } from "@/shared/ui/primitives/chip"
import { EmptyState } from "@/shared/ui/states/empty-state"
import { ErrorState } from "@/shared/ui/states/error-state"
import { Skeleton } from "@/shared/ui/states/skeleton"

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

describe("Skeleton", () => {
  it("marks itself busy and names what is loading", () => {
    const { container } = render(<Skeleton lines={4} label="Loading the session" />)
    expect(container.querySelector("[aria-busy='true']")).not.toBeNull()
    expect(screen.getByText("Loading the session")).toBeDefined()
  })
})

describe("Toggle", () => {
  it("is a switch with its checked state exposed", async () => {
    const onChange = vi.fn()
    render(<Toggle label="Disable the gate" checked={false} onChange={onChange} />)
    const control = screen.getByRole("switch")
    expect(control.getAttribute("aria-checked")).toBe("false")
    await userEvent.click(control)
    expect(onChange).toHaveBeenCalledWith(true)
  })

  it("is labelled and described by visible text, not a placeholder", () => {
    render(
      <Toggle
        label="Disable the gate"
        hint="For comparison only."
        checked
        onChange={() => undefined}
      />,
    )
    expect(screen.getByRole("switch", { name: "Disable the gate" })).toBeDefined()
    expect(screen.getByText("For comparison only.")).toBeDefined()
  })

  it("does not fire when disabled", async () => {
    const onChange = vi.fn()
    render(<Toggle label="Off" checked={false} disabled onChange={onChange} />)
    await userEvent.click(screen.getByRole("switch"))
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe("Dialog", () => {
  it("renders its title and body when open", () => {
    render(
      <Dialog open title="Close the session?" onClose={() => undefined}>
        Both sockets will be closed.
      </Dialog>,
    )
    expect(screen.getByText("Close the session?")).toBeDefined()
    expect(screen.getByText("Both sockets will be closed.")).toBeDefined()
  })

  it("offers a close control", async () => {
    const onClose = vi.fn()
    render(
      <Dialog open title="Title" onClose={onClose}>
        Body
      </Dialog>,
    )
    await userEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(onClose).toHaveBeenCalled()
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

describe("FigureWithMethod", () => {
  it("prints the command and the set size beside the figure", () => {
    render(
      <FigureWithMethod
        name="False-ask rate"
        value="12%"
        meaning="How often the gate asked when the value was already right."
        command="make eval"
        setDescription="the held-out set of 120 items"
      />,
    )
    expect(screen.getByText("12%")).toBeDefined()
    expect(screen.getByText("make eval")).toBeDefined()
    expect(screen.getByText(/over the held-out set of 120 items/)).toBeDefined()
  })

  it("says not measured yet rather than showing a zero", () => {
    render(
      <FigureWithMethod
        name="Catch rate"
        value={null}
        meaning="x"
        command="make eval"
        setDescription="y"
      />,
    )
    expect(screen.getByText(NOT_MEASURED)).toBeDefined()
  })
})
