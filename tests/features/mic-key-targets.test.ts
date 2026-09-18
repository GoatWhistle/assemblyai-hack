import { describe, expect, it } from "vitest"
import { insideDialog, ownsSpace } from "@/features/microphone/use-mic-keys"

function element(html: string): HTMLElement {
  const host = document.createElement("div")
  host.innerHTML = html
  const first = host.firstElementChild
  if (!(first instanceof HTMLElement)) {
    throw new Error("the fixture produced no element")
  }
  document.body.append(host)
  return first
}

describe("the global mic shortcut yields to whatever already owns the key", () => {
  it("leaves Space to a focused button", () => {
    expect(
      ownsSpace(element("<button type='button'>Play the recorded session</button>")),
      "a judge tabbing to the play button and pressing Space must not also toggle the session",
    ).toBe(true)
  })

  it("leaves Space to a link, a switch and a summary", () => {
    expect(ownsSpace(element("<a href='/demo'>Demonstration</a>"))).toBe(true)
    expect(ownsSpace(element("<span role='switch'>Gate</span>"))).toBe(true)
    expect(ownsSpace(element("<summary>More</summary>"))).toBe(true)
  })

  it("yields Space when the target sits inside a button", () => {
    const glyph = element("<button type='button'><span>icon</span></button>").firstElementChild
    expect(ownsSpace(glyph)).toBe(true)
  })

  it("keeps Space when nothing else claims it", () => {
    expect(ownsSpace(element("<p>Say the patient, the drug</p>"))).toBe(false)
    expect(ownsSpace(document.body)).toBe(false)
    expect(ownsSpace(null)).toBe(false)
  })

  it("leaves Escape to an open dialog, which closes natively", () => {
    expect(
      insideDialog(element("<dialog open><p>Order</p></dialog>")),
      "Escape inside a dialog must close the dialog, not end the call behind it",
    ).toBe(true)
    expect(insideDialog(element("<div role='dialog'><p>Order</p></div>"))).toBe(true)
  })

  it("keeps Escape when no dialog is open", () => {
    expect(insideDialog(element("<p>Listening</p>"))).toBe(false)
    expect(insideDialog(null)).toBe(false)
  })
})
