import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { Disclosure } from "@/shared/ui/navigation/disclosure"

const KEPT_ID = "kept"

describe("a disclosure folds a proof without removing it", () => {
  it("is a native details element whose summary is the visible claim", () => {
    const { container } = render(
      <Disclosure summary="Provenance is computed in the browser">
        <p>The browser holds the recognizer socket directly.</p>
      </Disclosure>,
    )
    const details = container.querySelector("details")
    expect(details, "native details needs no script and is keyboard-operable").not.toBeNull()
    expect(details?.open).toBe(false)
    expect(container.querySelector("summary")?.textContent).toContain(
      "Provenance is computed in the browser",
    )
    expect(
      screen.getByText("The browser holds the recognizer socket directly."),
      "folded content stays in the document, reachable by find-in-page and a fragment link",
    ).toBeDefined()
  })

  it("opens on activation and can start open", async () => {
    const user = userEvent.setup()
    const { container } = render(
      <>
        <Disclosure summary="Closed">body</Disclosure>
        <Disclosure summary="Open" defaultOpen id={KEPT_ID}>
          body
        </Disclosure>
      </>,
    )
    const [closed, open] = [...container.querySelectorAll("details")]
    expect(open?.open).toBe(true)
    expect(open?.id).toBe(KEPT_ID)
    await user.click(screen.getByText("Closed"))
    expect(closed?.open).toBe(true)
  })

  it("hides its chevron from assistive technology", () => {
    const { container } = render(<Disclosure summary="Claim">body</Disclosure>)
    expect(container.querySelector("summary svg")?.getAttribute("aria-hidden")).toBe("true")
  })
})
