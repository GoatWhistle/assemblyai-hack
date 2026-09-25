import { spawnSync } from "node:child_process"
import { describe, expect, it } from "vitest"
import { CONFIRM_VARIABLE, liveSmokeRefusal, URL_VARIABLE } from "./live-guard"

const PREVIEW = "https://readback-git-preview.vercel.app"

function withoutLiveVariables(): NodeJS.ProcessEnv {
  const env = { ...process.env }
  delete env[CONFIRM_VARIABLE]
  delete env[URL_VARIABLE]
  return env
}

function runHarness(extra: Record<string, string>) {
  return spawnSync("npx", ["playwright", "test", "-c", "tests/live/playwright.config.ts"], {
    encoding: "utf8",
    env: { ...withoutLiveVariables(), ...extra },
    shell: process.platform === "win32",
    timeout: 120_000,
  })
}

describe("S4: the live smoke refuses to spend without an explicit yes", () => {
  it("refuses without the paid confirmation, whatever the URL", () => {
    expect(liveSmokeRefusal({ [URL_VARIABLE]: PREVIEW })).toMatch(
      /LIVE_SMOKE_CONFIRM_PAID is not 1/,
    )
    expect(liveSmokeRefusal({ [URL_VARIABLE]: PREVIEW, [CONFIRM_VARIABLE]: "yes" })).toMatch(
      /is not 1/,
    )
  })

  it("refuses without a URL, with a non-https URL, and with this machine", () => {
    expect(liveSmokeRefusal({ [CONFIRM_VARIABLE]: "1" })).toMatch(/LIVE_SMOKE_URL is not set/)
    expect(
      liveSmokeRefusal({ [CONFIRM_VARIABLE]: "1", [URL_VARIABLE]: "http://example.com" }),
    ).toMatch(/must be https/)
    expect(
      liveSmokeRefusal({ [CONFIRM_VARIABLE]: "1", [URL_VARIABLE]: "https://localhost:3217" }),
    ).toMatch(/points at this machine/)
    expect(liveSmokeRefusal({ [CONFIRM_VARIABLE]: "1", [URL_VARIABLE]: "not a url" })).toMatch(
      /is not a URL/,
    )
  })

  it("passes only with both set to a public https deployment", () => {
    expect(liveSmokeRefusal({ [CONFIRM_VARIABLE]: "1", [URL_VARIABLE]: PREVIEW })).toBeNull()
  })

  it("stops the real Playwright run before any browser opens when the flag is unset", () => {
    const run = runHarness({ [URL_VARIABLE]: "http://localhost:3217" })
    expect(run.status, run.stdout).not.toBe(0)
    expect(`${run.stdout}${run.stderr}`).toMatch(
      /live smoke refused: LIVE_SMOKE_CONFIRM_PAID is not 1/,
    )
    expect(`${run.stdout}${run.stderr}`).not.toMatch(/passed|Running \d+ test/)
  }, 150_000)

  it("stops it too when the flag is set but the URL is the local dev server", () => {
    const run = runHarness({ [CONFIRM_VARIABLE]: "1", [URL_VARIABLE]: "http://localhost:3217" })
    expect(run.status).not.toBe(0)
    expect(`${run.stdout}${run.stderr}`).toMatch(
      /live smoke refused: LIVE_SMOKE_URL must be https/,
    )
  }, 150_000)
})
