import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { DemoScript } from "@/features/how-it-works/demo-script"
import {
  MICROPHONE_FREE_STEPS,
  SCRIPT_STEPS,
} from "@/features/how-it-works/demo-script/script-steps"

describe("the on-screen demo script is numbered and self-contained", () => {
  it("renders every step in order with its own number", () => {
    render(<DemoScript />)
    for (const [index, step] of SCRIPT_STEPS.entries()) {
      expect(screen.getByText(step.action)).toBeTruthy()
      expect(
        screen.getByText(String(index + 1)),
        "an unnumbered list of things to try is not a script; order is the whole value",
      ).toBeTruthy()
    }
  })

  it("includes the step that shows nothing changed", () => {
    expect(
      SCRIPT_STEPS.some((step) => step.action.includes("nothing changed")),
      "two competitors call this step out by name: a demo that only moves forward never proves the refusal was decided rather than staged",
    ).toBe(true)
  })

  it("includes the step that interrupts the agent", () => {
    expect(
      SCRIPT_STEPS.some((step) => step.action.includes("Interrupt")),
      "the agent hearing itself has already sunk a submission in this field; a judge has to be told to try it",
    ).toBe(true)
  })

  it("includes a step the product fails, rather than only the parts that work", () => {
    const admitted = SCRIPT_STEPS.find((step) =>
      step.watchFor.includes("We do not detect this"),
    )
    expect(
      admitted,
      "a script containing only the successes is a sales pitch; the self-correction gap is documented and belongs in the sequence",
    ).toBeDefined()
  })

  it("marks the steps that need a microphone, and most do not", () => {
    render(<DemoScript />)
    const marked = SCRIPT_STEPS.filter((step) => step.needsMicrophone)
    expect(
      marked.length,
      "a judge arriving without a microphone must be able to see how far the sequence still takes them",
    ).toBeGreaterThan(0)
    expect(MICROPHONE_FREE_STEPS).toBe(SCRIPT_STEPS.length - marked.length)
    expect(screen.getAllByText(/needs a microphone/i)).toHaveLength(marked.length)
  })

  it("points at the attack console rather than restating its seven attempts", () => {
    const attack = SCRIPT_STEPS.find((step) => step.id === "attack")
    expect(
      attack?.href,
      "the console is on this same page; a link away from it would be wrong",
    ).toBe(null)
    expect(
      attack?.watchFor,
      "the console already lists its own attempts; repeating them here creates two places to keep in step",
    ).not.toMatch(/threshold to zero/i)
  })

  it("does not copy the README's wording, because the screen and the page have different readers", () => {
    const readme = readFileSync("README.md", "utf8")
    for (const step of SCRIPT_STEPS) {
      expect(
        readme.includes(step.watchFor),
        `"${step.action}" carries the README sentence verbatim; the same text in two places drifts in one of them`,
      ).toBe(false)
    }
  })
})

describe("the new judge surfaces are rendered by pages, not stranded in the tree", () => {
  it("renders the numbered script from the how-it-works page", () => {
    const page = readFileSync("app/(pages)/how-it-works/page.tsx", "utf8")
    expect(
      page,
      "an on-screen script exists so a judge with no README open can follow it; unrendered it helps nobody",
    ).toContain("<DemoScript />")
  })

  it("places the script before the attack console it points at", () => {
    const page = readFileSync("app/(pages)/how-it-works/page.tsx", "utf8")
    expect(
      page.indexOf("<DemoScript />") < page.indexOf("<AttackConsole />"),
      "a step that says to attack the gate below has to actually come before the console",
    ).toBe(true)
  })
})
