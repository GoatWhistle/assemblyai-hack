import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { EXPECTATIONS, SMOKE_SCOPE } from "../../scripts/report/smoke-expectations"

const SCRIPT = "scripts/report/smoke-fixtures.ts"
const EXPECTATIONS_FILE = "scripts/report/smoke-expectations.ts"

function runSmoke(): { code: number; output: string } {
  try {
    const output = execFileSync("npx", ["tsx", SCRIPT], {
      encoding: "utf8",
      stdio: "pipe",
      shell: true,
    })
    return { code: 0, output }
  } catch (error) {
    const shaped = error as { status?: number; stdout?: string; stderr?: string }
    return { code: shaped.status ?? 1, output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}` }
  }
}

describe("the recorded fixtures still reach the decisions they were recorded to reach", () => {
  it("passes on the fixtures as they stand", { timeout: 60000 }, () => {
    const { code, output } = runSmoke()
    expect(
      code,
      `the smoke check must pass on a clean tree before any of the assertions below mean anything: ${output}`,
    ).toBe(0)
    expect(output).toContain("SMOKE PASSED")
  })

  it("exercises more than one fixture, since a single case proves almost nothing", () => {
    expect(
      EXPECTATIONS.length,
      "one recorded scenario cannot cover the branches this replays: a catalogue miss, a checksum failure and a pair hit reach the gate by different routes",
    ).toBeGreaterThan(2)
  })

  it("covers the pair check, which is the branch the product exists for", () => {
    const reasons = EXPECTATIONS.map((expectation) => expectation.reasonCode)
    expect(
      reasons,
      "a smoke check over the server side of the audio path that never replays a LASA hit would pass while the central claim went untested",
    ).toContain("E_LASA_HIT")
  })

  it("names what it cannot reach rather than implying full coverage", () => {
    expect(
      SMOKE_SCOPE,
      "this replays the server half only; a scope note that did not say so would let a green smoke check read as proof that capture, the worklet and the resample paths work",
    ).toMatch(/does not touch src\/audio/)
    for (const unreachable of ["capture", "worklet", "resample", "echo"]) {
      expect(SMOKE_SCOPE).toContain(unreachable)
    }
  })

  it("refuses to pass on an empty expectation list", () => {
    const source = readFileSync(EXPECTATIONS_FILE, "utf8")
    expect(
      source,
      "an empty subject is the defect class this project has found three times: a check that passes having examined nothing manufactures confidence",
    ).toContain("EXPECTATIONS")
    const guard = readFileSync(SCRIPT, "utf8")
    expect(
      guard,
      "the script itself must hold the empty-list refusal, not the caller, because a caller can be bypassed",
    ).toMatch(/EXPECTATIONS\.length === 0/)
  })
})
