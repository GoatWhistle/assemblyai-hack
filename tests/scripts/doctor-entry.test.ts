import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const DOCTOR = "scripts/report/doctor.ts"

function runDoctor(env: Record<string, string>): { code: number; output: string } {
  try {
    const output = execFileSync("npx", ["tsx", DOCTOR], {
      encoding: "utf8",
      stdio: "pipe",
      shell: true,
      env: { ...process.env, ASSEMBLYAI_API_KEY: "", ASSEMBLYAI_AGENT_ID: "", ...env },
    })
    return { code: 0, output }
  } catch (error) {
    const shaped = error as { status?: number; stdout?: string; stderr?: string }
    return {
      code: shaped.status ?? -1,
      output: `${shaped.stdout ?? ""}${shaped.stderr ?? ""}`,
    }
  }
}

describe("the doctor entry point fails loudly instead of printing a reassuring summary", () => {
  it(
    "exits non-zero and prints the word FAILED when a credential is missing, rather than reporting that everything passed",
    { timeout: 120000 },
    () => {
      const result = runDoctor({})
      expect(
        result.code,
        "two competitors in this field print ALL VERIFICATIONS PASSED while skipping checks; a doctor that cannot run its checks must exit non-zero",
      ).not.toBe(0)
      expect(
        result.output,
        "the summary must name the failure count, because a silent skip is the exact defect this task exists to avoid",
      ).toContain("FAILED")
      expect(
        result.output,
        "an unset key must be reported as a failed check by name, not omitted from the table",
      ).toContain("ASSEMBLYAI_API_KEY")
    },
  )

  it(
    "never claims a pass it did not earn: the phrase all checks passed is absent from a run whose checks failed",
    { timeout: 120000 },
    () => {
      const result = runDoctor({})
      expect(
        result.output.toLowerCase(),
        "printing a passing phrase alongside failing rows is how a reassuring summary misleads a reader who skims",
      ).not.toContain("all checks passed")
    },
  )

  it(
    "states in its own output that it is free, so a reader knows running it does not spend credit",
    { timeout: 120000 },
    () => {
      const result = runDoctor({})
      expect(
        result.output,
        "the cost line must be visible in the output itself; a promise made only in a doc cannot be checked by whoever runs the command",
      ).toMatch(/free/i)
      expect(
        result.output,
        "the output must say explicitly that no WebSocket is opened, because that is what makes the probe free",
      ).toMatch(/never opens a streaming or agent WebSocket/)
    },
  )

  it("opens no paid socket, proven over the source of both doctor files rather than over its printed promise", () => {
    const sources = [DOCTOR, "scripts/report/doctor-checks.ts"].map((path) =>
      readFileSync(path, "utf8"),
    )
    for (const [index, source] of sources.entries()) {
      expect(
        source,
        `${index === 0 ? DOCTOR : "scripts/report/doctor-checks.ts"} must not construct a WebSocket: a liveness probe that opened one would bill at 5.10 per hour while claiming to be free`,
      ).not.toMatch(/WebSocket\s*\(|wss:\/\//)
    }
  })

  it("routes every request through an injected transport, which is what lets a test exercise it without a network", () => {
    const source = readFileSync(DOCTOR, "utf8")
    expect(
      source,
      "doctor.ts must hand runAllChecks a doFetch; a hard-coded global fetch would make the checks untestable and the stub in doctor-checks.test.ts meaningless",
    ).toContain("doFetch")
  })
})
