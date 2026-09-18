import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { AttackConsole } from "@/features/attack-console"
import { ATTACKS } from "@/features/attack-console/attacks"

describe("the refusal a judge triggers is announced, not only drawn", () => {
  it("renders every attack as a reachable button before anything is attempted", () => {
    render(<AttackConsole />)
    const buttons = screen.getAllByRole("button", { name: "Attempt the write" })
    expect(buttons).toHaveLength(ATTACKS.length)
    for (const button of buttons) {
      expect((button as HTMLButtonElement).disabled).toBe(false)
    }
  })

  it("puts the refusal in a live region so a screen reader reads it out", async () => {
    const user = userEvent.setup()
    render(<AttackConsole />)
    expect(screen.queryAllByRole("status")).toHaveLength(0)

    await user.click(screen.getAllByRole("button", { name: "Attempt the write" })[0] as Element)

    const announced = screen.getAllByRole("status")
    expect(
      announced,
      "the refusal is the product's whole claim; drawn but unannounced, it reaches nobody using a screen reader",
    ).toHaveLength(1)
    expect(announced[0]?.textContent).toContain("refused")
  })

  it("announces a refusal for every attack the console offers", async () => {
    const user = userEvent.setup()
    render(<AttackConsole />)
    const buttons = screen.getAllByRole("button", { name: "Attempt the write" })
    for (const button of buttons) {
      await user.click(button)
    }
    const announced = screen.getAllByRole("status")
    expect(announced).toHaveLength(ATTACKS.length)
    for (const region of announced) {
      expect(
        region.textContent,
        "an attack that writes a value would argue against the product, and it must not read as refused either",
      ).toContain("refused")
    }
  })

  it("labels the gate's own error string as machine output rather than as prose", async () => {
    const user = userEvent.setup()
    render(<AttackConsole />)
    const buttons = screen.getAllByRole("button", { name: "Attempt the write" })
    for (const button of buttons) {
      await user.click(button)
    }
    const labels = screen.getAllByText(/what the gate itself raised, verbatim/i)
    expect(
      labels.length,
      "strings like the decision belongs to candidate attack-metformin are audit-trail text; unlabelled beside plain prose a non-engineer reads them as the explanation",
    ).toBeGreaterThan(0)
    for (const region of screen.getAllByRole("status")) {
      expect(region.textContent).toMatch(/what the gate itself raised, verbatim/i)
    }
  })

  it("keeps focus on the button that was activated, so the keyboard path is not lost", async () => {
    const user = userEvent.setup()
    render(<AttackConsole />)
    const button = screen.getAllByRole("button", {
      name: "Attempt the write",
    })[2] as HTMLElement
    button.focus()
    await user.keyboard("{Enter}")
    expect(document.activeElement).toBe(button)
  })
})
