import { spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { expect, type Page, test } from "@playwright/test"
import { type InjectorLog, injectorScript } from "./caller-injector"
import { type CallerLineId, lineFile } from "./lines"
import { liveSmokeRefusal, URL_VARIABLE } from "./live-guard"
import {
  judgeRun,
  type RunObservation,
  type RunVerdict,
  SCENARIOS,
  type SmokeScenario,
} from "./scenarios"

const AGENT_HOST = "agents.us.assemblyai.com"
const SCENARIO_BUDGET_MS = 240_000
const SESSION_SPACING_MS = 30_000
const POLL_MS = 2_000

let lastRunEndedAt = 0

function linesFor(scenario: SmokeScenario): Record<string, string> {
  const ids = new Set<CallerLineId>(scenario.steps.map((step) => step.line))
  return Object.fromEntries(
    [...ids].map((id) => [id, readFileSync(lineFile(id)).toString("base64")]),
  )
}

async function observe(page: Page): Promise<RunObservation> {
  const region = page.getByRole("region", { name: "Order summary" })
  const orderText = (await region.count()) > 0 ? await region.innerText() : ""
  const log = await page.evaluate(
    () =>
      (window as unknown as { readbackCallerInjector?: InjectorLog }).readbackCallerInjector ??
      null,
  )
  return { orderText, log }
}

async function sessionIdOf(page: Page): Promise<string | null> {
  const term = page.getByText("Session issued by the server", { exact: true })
  if ((await term.count()) === 0) {
    return null
  }
  const text = (
    (await term.first().locator("xpath=following-sibling::dd").textContent()) ?? ""
  ).trim()
  return text.length === 0 || text === "not bound yet" ? null : text
}

function record(input: {
  scenario: SmokeScenario
  verdict: RunVerdict
  sessionId: string | null
  seconds: number
}): void {
  const run = spawnSync(
    process.execPath,
    [
      "node_modules/tsx/dist/cli.mjs",
      "scripts/live-receipt.ts",
      "--kind",
      "live_smoke",
      "--command",
      "make live-smoke",
      "--deployment",
      String(process.env[URL_VARIABLE]),
      "--session",
      input.sessionId ?? `unbound-${input.scenario.id}-${Date.now()}`,
      "--outcome",
      input.verdict.outcome,
      "--reason",
      `live smoke ${input.verdict.reason}; socket time is the harness wall clock, an upper bound`,
      "--agent-seconds",
      input.seconds.toFixed(1),
      "--stt-seconds",
      input.seconds.toFixed(1),
    ],
    { encoding: "utf8" },
  )
  if (run.status !== 0) {
    throw new Error(`the run record was not written: ${run.stderr || run.stdout}`)
  }
}

test.beforeAll(() => {
  const refusal = liveSmokeRefusal(process.env)
  if (refusal !== null) {
    throw new Error(refusal)
  }
})

for (const scenario of SCENARIOS) {
  test(`${scenario.id}: ${scenario.title}`, async ({ page }) => {
    const wait = lastRunEndedAt + SESSION_SPACING_MS - Date.now()
    if (wait > 0) {
      await page.waitForTimeout(wait)
    }
    await page.addInitScript({
      content: injectorScript({
        agentHost: AGENT_HOST,
        steps: scenario.steps,
        lines: linesFor(scenario),
      }),
    })
    await page.goto("/")
    const started = Date.now()
    await page.getByRole("button", { name: "Start listening" }).click()

    let observation = await observe(page)
    let verdict = judgeRun(scenario, observation)
    while (verdict.outcome !== "completed" && Date.now() - started < SCENARIO_BUDGET_MS) {
      await page.waitForTimeout(POLL_MS)
      observation = await observe(page)
      verdict = judgeRun(scenario, observation)
    }

    const stop = page.getByRole("button", { name: "Stop listening" })
    if ((await stop.count()) > 0) {
      await stop.first().click()
    }
    await page.waitForTimeout(5_000)
    lastRunEndedAt = Date.now()

    const sessionId = await sessionIdOf(page)
    record({ scenario, verdict, sessionId, seconds: (lastRunEndedAt - started) / 1000 })
    expect(verdict.outcome, verdict.reason).toBe("completed")
  })
}
