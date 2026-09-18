import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { FieldName } from "@/domain"
import { FinishAnswer } from "@/features/microphone/finish-answer"
import { patienceFor } from "@/realtime/patience"
import { REDUCED_MOTION_QUERY } from "@/shared/ui/motion/use-reduced-motion"

describe("the control says what it is for", () => {
  it("is disabled and explains itself rather than sitting greyed with no reason", () => {
    render(<FinishAnswer live={false} patience={patienceFor(FieldName.PrescriberNpi)} />)
    const control = screen.getByRole("button", { name: /finished this answer/i })
    expect(control).toHaveProperty("disabled", true)
    expect(
      screen.getByText(/available once the line is open/i),
      "a disabled control with no sentence beside it reads as a broken button",
    ).toBeDefined()
  })

  it("names the silence it saves the speaker, in the units of the active preset", () => {
    render(<FinishAnswer live={true} patience={patienceFor(FieldName.PrescriberNpi)} />)
    expect(screen.getByText(/4200 ms of silence/)).toBeDefined()
  })

  it("acknowledges the press instead of leaving the speaker guessing", async () => {
    const onFinish = vi.fn()
    render(
      <FinishAnswer
        live={true}
        patience={patienceFor(FieldName.PatientName)}
        onFinish={onFinish}
      />,
    )
    await userEvent.click(screen.getByRole("button", { name: /finished this answer/i }))
    expect(onFinish).toHaveBeenCalledOnce()
    expect(screen.getByText(/endpoint forced/i)).toBeDefined()
  })

  it("takes a still class instead of the animated one when motion is refused", () => {
    const media = vi.fn((query: string) => ({
      matches: query === REDUCED_MOTION_QUERY,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
    vi.stubGlobal("matchMedia", media)
    render(<FinishAnswer live={true} patience={patienceFor(FieldName.Sig)} />)
    const control = screen.getByRole("button", { name: /finished this answer/i })
    expect(
      control.className,
      "the press feedback has to change form under reduced motion, not merely run faster",
    ).toContain("still")
    expect(control.className).not.toContain("animated")
    vi.unstubAllGlobals()
  })
})
