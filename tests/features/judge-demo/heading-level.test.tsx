import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { JudgeDemo } from "@/features/judge-demo"
import { INSTANT_ENTRY_HEADING, InstantEntry } from "@/features/judge-demo/instant-entry"

describe("judge demo heading level", () => {
  it("renders its own title as h1 by default, when it is the only heading around it", () => {
    render(<JudgeDemo />)
    const heading = screen.getByRole("heading", { name: /The forty-second demonstration/i })
    expect(
      heading.tagName,
      "standing alone, JudgeDemo carries the only heading and must stay an h1",
    ).toBe("H1")
  })

  it("demotes its title to h2 when embedded under another page heading, as on the /demo hub", () => {
    render(<JudgeDemo headingLevel="h2" />)
    const heading = screen.getByRole("heading", { name: /The forty-second demonstration/i })
    expect(
      heading.tagName,
      "the /demo hub opens with its own h1; JudgeDemo's title must not also claim h1 or the document has two, with the second appearing out of order",
    ).toBe("H2")
  })
})

describe("instant entry heading level", () => {
  it("defaults to h2, since it is meant to sit under a page's own h1", () => {
    render(<InstantEntry />)
    const heading = screen.getByRole("heading", { name: INSTANT_ENTRY_HEADING })
    expect(heading.tagName).toBe("H2")
  })

  it("becomes h1 when a page makes it the first heading a judge reads", () => {
    render(<InstantEntry headingLevel="h1" />)
    const heading = screen.getByRole("heading", { name: INSTANT_ENTRY_HEADING })
    expect(
      heading.tagName,
      "a page with no other h1 that opens on the instant entry makes its heading the real headline, so it must be the h1",
    ).toBe("H1")
  })
})
