import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { Button } from "@/shared/ui/primitives/button"

describe("Button states", () => {
  it("defaults to a non-submitting button, so it cannot post a form by accident", () => {
    render(<Button>Take an order</Button>)
    expect(screen.getByRole("button").getAttribute("type")).toBe("button")
  })

  it("calls its handler on click and on the keyboard", async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick}>Start</Button>)
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).toHaveBeenCalledTimes(1)
    screen.getByRole("button").focus()
    await userEvent.keyboard("{Enter}")
    await userEvent.keyboard(" ")
    expect(onClick).toHaveBeenCalledTimes(3)
  })

  it("is not clickable when disabled", async () => {
    const onClick = vi.fn()
    render(
      <Button disabled onClick={onClick}>
        Stop
      </Button>,
    )
    await userEvent.click(screen.getByRole("button"))
    expect(onClick).not.toHaveBeenCalled()
  })

  it("marks itself busy and blocks clicks while loading", async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Minting
      </Button>,
    )
    const button = screen.getByRole("button")
    expect(button.getAttribute("aria-busy")).toBe("true")
    expect(button.hasAttribute("disabled")).toBe(true)
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it("announces the loading state to assistive technology", () => {
    render(
      <Button loading loadingLabel="Minting a short-lived token">
        Start
      </Button>,
    )
    expect(screen.getByText("Minting a short-lived token")).toBeDefined()
  })

  it("keeps an accessible name across every tone and size", () => {
    for (const tone of ["neutral", "primary", "danger", "quiet"] as const) {
      for (const size of ["small", "medium", "large"] as const) {
        const { unmount } = render(
          <Button tone={tone} size={size}>
            Act
          </Button>,
        )
        expect(screen.getByRole("button", { name: "Act" })).toBeDefined()
        unmount()
      }
    }
  })

  it("is reachable by keyboard focus", async () => {
    render(<Button>Focusable</Button>)
    await userEvent.tab()
    expect(document.activeElement).toBe(screen.getByRole("button"))
  })
})
