import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"
import { IntakeRail } from "@/features/intake/intake-rail"
import { confidenceFigures, errorRateFigures } from "@/features/metrics/measured-figures"
import { initialContext } from "@/features/read-back/read-back-machine"
import { Figure, FigureGroup } from "@/shared/ui/data-display/figure"

const NOT_OBSERVED = "not observed yet"

const ABSENCE_NOTE = "Nothing has been observed, so this is absence rather than a clean run."

describe("a figure keeps a measured zero apart from an unmeasured absence", () => {
  it("renders a measured zero as the digit zero", () => {
    render(
      <FigureGroup>
        <Figure label="blocked values" value={0} absentLabel={NOT_OBSERVED} />
      </FigureGroup>,
    )
    expect(
      screen.getByText("0"),
      "a real zero must be published: hiding it makes the cost side of the gate invisible",
    ).toBeDefined()
    expect(screen.queryByRole("img", { name: NOT_OBSERVED })).toBeNull()
  })

  it("renders an absent count as a labelled dash, never as a digit", () => {
    render(
      <FigureGroup>
        <Figure label="blocked values" value={null} absentLabel={NOT_OBSERVED} />
      </FigureGroup>,
    )
    expect(
      screen.getByRole("img", { name: NOT_OBSERVED }),
      "absence rendered as zero is the bug that has bitten this project three times",
    ).toBeDefined()
    expect(screen.queryByText("0")).toBeNull()
  })

  it("explains what the absence means, since a blank invites the wrong reading", () => {
    render(
      <FigureGroup>
        <Figure label="blocked values" value={null} note={ABSENCE_NOTE} />
      </FigureGroup>,
    )
    expect(screen.getByText(ABSENCE_NOTE)).toBeDefined()
  })

  it("prints the denominator for a measured count and suppresses it for an absent one", () => {
    const { unmount } = render(
      <FigureGroup>
        <Figure label="blocked values" value={2} interval="of 7" />
      </FigureGroup>,
    )
    expect(
      screen.getByText(/of 7/),
      "a figure carries the size of the set it came from",
    ).toBeDefined()
    unmount()
    render(
      <FigureGroup>
        <Figure label="blocked values" value={null} interval="of 7" />
      </FigureGroup>,
    )
    expect(
      screen.queryByText(/of 7/),
      "a denominator beside an unobserved count implies a measurement that never ran",
    ).toBeNull()
  })
})

describe("the rail says nothing was proposed rather than counting zero", () => {
  it("does not label an empty order with a zero", () => {
    render(
      <IntakeRail
        candidates={[]}
        selectedCandidateId={null}
        transcript={[]}
        selection={null}
        readBack={initialContext()}
        echoDiscards={0}
        onSelectCandidate={() => undefined}
        onSelectWord={() => undefined}
      />,
    )
    expect(
      screen.getByText("nothing proposed yet"),
      "zero so far reads as a gate that was consulted and proposed nothing",
    ).toBeDefined()
    expect(screen.queryByText("0 so far")).toBeNull()
  })
})

describe("a published figure over an empty set reads as not measured", () => {
  it("never publishes a ratio whose denominator is zero", () => {
    for (const figure of [...errorRateFigures(), ...confidenceFigures()]) {
      if (figure.value === null) {
        continue
      }
      expect(
        figure.value,
        `${figure.id} publishes a ratio over an empty set, which is a number without a method`,
      ).not.toMatch(/\bof 0$/)
    }
  })
})
