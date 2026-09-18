import { readFileSync } from "node:fs"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"
import { GateAction, policyFor, ReasonCode } from "@/domain"
import { SCENARIO_GROUP_LABEL, ScenarioPicker } from "@/features/judge-demo/scenario-picker"
import {
  acceptingScenarios,
  DEFAULT_SCENARIO_ID,
  reasonCodesShown,
  refusingScenarios,
  SCENARIOS,
  ScenarioId,
  scenarioFor,
} from "@/features/judge-demo/scenario-picker/scenarios"
import { decide } from "@/gate"

describe("one button, one scenario", () => {
  it("renders exactly one button per scenario and no extras", () => {
    render(<ScenarioPicker />)
    for (const scenario of SCENARIOS) {
      expect(
        screen.getByRole("button", { name: new RegExp(scenario.label, "i") }),
        `${scenario.id} has no button, so a scenario the code computes cannot be reached from the screen`,
      ).toBeDefined()
    }
    const group = screen.getByRole("group", { name: new RegExp(SCENARIO_GROUP_LABEL, "i") })
    expect(
      group.querySelectorAll("button[aria-pressed]").length,
      "a button without a scenario behind it would show a situation nothing computed",
    ).toBe(SCENARIOS.length)
  })

  it("marks exactly one button pressed at a time", async () => {
    render(<ScenarioPicker />)
    const group = screen.getByRole("group", { name: new RegExp(SCENARIO_GROUP_LABEL, "i") })
    const pressedCount = () => group.querySelectorAll('button[aria-pressed="true"]').length
    expect(pressedCount()).toBe(1)
    await userEvent.click(screen.getByRole("button", { name: /clean order/i }))
    expect(
      pressedCount(),
      "two scenarios shown as current would leave a reader unable to tell which decision belongs to which situation",
    ).toBe(1)
  })

  it("refuses an unknown scenario rather than rendering nothing", () => {
    expect(() => scenarioFor("threshold" as ScenarioId)).toThrow(RangeError)
  })
})

describe("the label lives in the header", () => {
  it("puts the current scenario's label inside the section header element", () => {
    const { container } = render(<ScenarioPicker />)
    const header = container.querySelector("header")
    const scenario = scenarioFor(DEFAULT_SCENARIO_ID)
    expect(header, "the picker must have a header to put the label in").not.toBeNull()
    expect(
      header?.textContent,
      "the brief puts the label in the header rather than in a separate section, so a reader always knows what is on screen without hunting for a caption",
    ).toContain(scenario.label)
  })

  it("puts the reason code in the header beside the label", () => {
    const { container } = render(<ScenarioPicker />)
    const header = container.querySelector("header")
    expect(header?.textContent).toContain(scenarioFor(DEFAULT_SCENARIO_ID).decision.reasonCode)
  })

  it("keeps the header label in step with the button that was pressed", async () => {
    const { container } = render(<ScenarioPicker />)
    const target = scenarioFor(ScenarioId.ChecksumRejected)
    await userEvent.click(screen.getByRole("button", { name: new RegExp(target.label, "i") }))
    const header = container.querySelector("header")
    expect(
      header?.textContent,
      "a header that kept the old label after a click would be describing a decision that is no longer on screen, which is worse than no label",
    ).toContain(target.label)
    expect(header?.textContent).toContain(target.decision.reasonCode)
    expect(header?.textContent).not.toContain(scenarioFor(DEFAULT_SCENARIO_ID).label)
  })

  it("announces the label change, so it is not a silent swap for a screen reader", () => {
    const { container } = render(<ScenarioPicker />)
    const live = container.querySelector('[aria-live="polite"]')
    expect(live?.textContent).toContain(scenarioFor(DEFAULT_SCENARIO_ID).label)
  })
})

describe("every decision on screen is computed by the shipped gate", () => {
  it("derives each scenario's decision from decide() over the real policy table", () => {
    for (const scenario of SCENARIOS) {
      const raised = decide(scenario.candidate, policyFor(scenario.candidate.field))
      expect(
        scenario.decision,
        `${scenario.id} would be showing a hand-written outcome, which is the defect this project accuses the field of`,
      ).toEqual(raised)
    }
  })

  it("shows the gate's own utterance for the selected scenario", async () => {
    render(<ScenarioPicker />)
    const target = scenarioFor(ScenarioId.QuietRoom)
    await userEvent.click(screen.getByRole("button", { name: new RegExp(target.label, "i") }))
    expect(screen.getByText(target.decision.agentUtterance)).toBeDefined()
  })
})

describe("the set of scenarios covers what a judge has to see", () => {
  it("includes the one where the gate refuses", () => {
    expect(
      refusingScenarios().length,
      "the brief requires the refusing scenario; a picker of accepted values would hide the product",
    ).toBeGreaterThan(0)
  })

  it("includes at least one the gate accepts, so the picker is not all refusals", () => {
    expect(
      acceptingScenarios().length,
      "false-ask rate is the published cost side of the idea, and a picker with no accepted case argues the opposite",
    ).toBeGreaterThan(0)
  })

  it("covers all three reasons to re-ask with a distinct reason code each", () => {
    const codes = new Set(reasonCodesShown())
    expect(
      codes.has(ReasonCode.LowConfidence),
      "the confidence reason must be reachable from the picker",
    ).toBe(true)
    expect(
      codes.has(ReasonCode.ValidatorChecksum),
      "the validator reason must be reachable from the picker",
    ).toBe(true)
    expect(
      codes.has(ReasonCode.LasaHit),
      "the pair reason is the one the product exists for and must be reachable from the picker",
    ).toBe(true)
  })

  it("gives every scenario its own reason code, so no two buttons show the same outcome", () => {
    const codes = reasonCodesShown()
    expect(
      new Set(codes).size,
      "two buttons resolving to the same reason code would spend a judge's attention twice on one branch",
    ).toBe(codes.length)
  })

  it("defaults to the pair hit, the scenario that explains the product", () => {
    expect(DEFAULT_SCENARIO_ID).toBe(ScenarioId.PairHitAtCeiling)
    const scenario = scenarioFor(DEFAULT_SCENARIO_ID)
    expect(scenario.decision.reasonCode).toBe(ReasonCode.LasaHit)
    expect(scenario.decision.action).toBe(GateAction.AskDisambiguate)
  })
})

describe("the pair scenario asks at the ceiling of certainty", () => {
  it("carries certainty 1.00 and still resolves to a pair ask", () => {
    const scenario = scenarioFor(ScenarioId.PairHitAtCeiling)
    expect(
      scenario.candidate.provenance.minConfidence,
      "a demonstration below 1.00 invites the reply that a higher threshold would have caught it",
    ).toBe(1)
    expect(scenario.decision.reasonCode).toBe(ReasonCode.LasaHit)
  })

  it("passes its validator, so only the published pair objects", () => {
    const scenario = scenarioFor(ScenarioId.PairHitAtCeiling)
    expect(scenario.candidate.verdict.outcome).toBe("passed")
    expect(scenario.candidate.lasa.hit).toBe(true)
  })
})

describe("the accepted scenario is genuinely accepted", () => {
  it("resolves to accept rather than to a quiet ask", () => {
    const scenario = scenarioFor(ScenarioId.CleanOrder)
    expect(
      scenario.decision.action,
      "labelling a scenario as written while the gate asks about it would be the page contradicting its own engine",
    ).toBe(GateAction.Accept)
  })

  it("sits on a field whose policy carries no standing read-back requirement", () => {
    const scenario = scenarioFor(ScenarioId.CleanOrder)
    expect(
      policyFor(scenario.candidate.field).readBackAlways,
      "a field with readBackAlways true can never be accepted silently, so it cannot carry the accepted scenario",
    ).toBe(false)
  })
})

describe("the field card remounts on every scenario switch", () => {
  it("gives the card its own key per scenario, so its entrance motion can retrigger", () => {
    const source = readFileSync("src/features/judge-demo/scenario-picker/index.tsx", "utf8")
    const fieldCardLine = source.match(/<FieldCard[^>]*\/>/)?.[0] ?? ""
    expect(
      fieldCardLine,
      "without a key tied to the scenario, React reuses the same card element across scenarios that share a CSS class, so its readback-enter animation never restarts after the first scenario shown; two different values then arrive on screen with no motion telling the judge anything changed",
    ).toMatch(/key=\{scenario\.id\}/)
  })
})

describe("what each button promises matches what the gate does", () => {
  it("says the gate writes it only for scenarios that accept", () => {
    render(<ScenarioPicker />)
    const writes = screen.getAllByText(/the gate writes it/i).length
    const asks = screen.getAllByText(/the gate asks first/i).length
    expect(
      writes,
      "a button promising the gate writes a value while the gate asks about it is a claim the engine contradicts",
    ).toBe(acceptingScenarios().length)
    expect(asks).toBe(refusingScenarios().length)
  })
})
