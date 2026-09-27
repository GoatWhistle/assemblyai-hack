import { type Browser, expect, type Page, test } from "@playwright/test"

type Centre = { readonly x: number; readonly y: number; readonly top: number }

type Setup = {
  readonly name: string
  readonly budgetSpent?: boolean
  readonly microphoneError?: string
  readonly tokenStatus?: number
  readonly tokenCode?: string
  readonly holdTokens?: boolean
  readonly press: boolean
  readonly settled: (page: Page) => Promise<void>
}

const VIEWPORTS = [
  { width: 1440, height: 900 },
  { width: 1920, height: 1080 },
  { width: 390, height: 844 },
] as const

const TOLERANCE_PX = 1

const MIC_NAME = /^(Start listening|Cancel|Ending the call)$/

function cardHeading(title: RegExp): (page: Page) => Promise<void> {
  return async (page) => {
    await expect(page.getByRole("alert").getByRole("heading", { name: title })).toBeVisible()
  }
}

const SETUPS: readonly Setup[] = [
  {
    name: "connecting",
    holdTokens: true,
    press: true,
    settled: async (page) => {
      await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    },
  },
  {
    name: "budget paused",
    budgetSpent: true,
    press: false,
    settled: async (page) => {
      await expect(
        page.getByRole("region", { name: "Live calls are paused for today" }),
      ).toBeVisible()
    },
  },
  {
    name: "microphone refused",
    microphoneError: "NotAllowedError",
    press: true,
    settled: cardHeading(/permission was refused/i),
  },
  {
    name: "no microphone",
    microphoneError: "NotFoundError",
    press: true,
    settled: cardHeading(/no microphone was found/i),
  },
  {
    name: "microphone busy",
    microphoneError: "NotReadableError",
    press: true,
    settled: cardHeading(/in use elsewhere/i),
  },
  {
    name: "token refused",
    tokenStatus: 500,
    press: true,
    settled: cardHeading(/could not be minted/i),
  },
  {
    name: "too many sessions",
    tokenStatus: 429,
    press: true,
    settled: cardHeading(/too many sessions/i),
  },
  {
    name: "budget cap refused the call",
    tokenStatus: 429,
    tokenCode: "E_DAILY_BUDGET_EXHAUSTED",
    press: true,
    settled: cardHeading(/budget refused this call/i),
  },
]

async function prepare(page: Page, setup: Setup | null): Promise<void> {
  await page.route("**/api/budget", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        setup?.budgetSpent === true
          ? { budget: { remainingSeconds: 0, exhausted: true }, explanation: "spent" }
          : { budget: { remainingSeconds: 7200, exhausted: false } },
      ),
    }),
  )
  await page.route("**/api/tokens/**", (route) => {
    if (setup === null || setup.holdTokens === true) {
      return new Promise<void>(() => undefined)
    }
    return route.fulfill({
      status: setup.tokenStatus ?? 500,
      contentType: "application/json",
      body: JSON.stringify({ code: setup.tokenCode ?? "E_TEST", explanation: "refused" }),
    })
  })
  const refusal = setup?.microphoneError
  if (refusal !== undefined) {
    await page.addInitScript((name) => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("refused by the test", name))
    }, refusal)
  }
}

async function micCentre(page: Page): Promise<Centre> {
  const box = await page.getByRole("button", { name: MIC_NAME }).boundingBox()
  if (box === null) {
    throw new Error("the microphone button has no box")
  }
  const scrolled = await page.evaluate(() => window.scrollY)
  return {
    x: box.x + box.width / 2,
    y: box.y + box.height / 2 + scrolled,
    top: box.y + box.height / 2,
  }
}

async function measure(
  browser: Browser,
  viewport: (typeof VIEWPORTS)[number],
  setup: Setup | null,
): Promise<Centre> {
  const context = await browser.newContext({ viewport, permissions: ["microphone"] })
  const page = await context.newPage()
  await prepare(page, setup)
  await page.goto("/")
  await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible()
  if (setup?.press === true) {
    await page.getByRole("button", { name: "Start listening" }).click()
  }
  await setup?.settled(page)
  await page.waitForTimeout(400)
  const centre = await micCentre(page)
  await context.close()
  return centre
}

test.describe("the microphone stands still before a call is live", () => {
  for (const viewport of VIEWPORTS) {
    test(`every pre-call state keeps the microphone centre at ${viewport.width}x${viewport.height}`, async ({
      browser,
    }) => {
      test.setTimeout(120000)
      const resting = await measure(browser, viewport, null)
      if (viewport.width >= 1280) {
        expect(
          Math.abs(resting.top - viewport.height / 2),
          "on a wide screen the microphone sits at the viewport centre",
        ).toBeLessThanOrEqual(TOLERANCE_PX)
      }
      for (const setup of SETUPS) {
        const centre = await measure(browser, viewport, setup)
        expect(Math.abs(centre.x - resting.x), `${setup.name}: horizontal`).toBeLessThanOrEqual(
          TOLERANCE_PX,
        )
        expect(
          Math.abs(centre.y - resting.y),
          `${setup.name}: in the page`,
        ).toBeLessThanOrEqual(TOLERANCE_PX)
        expect(
          Math.abs(centre.top - resting.top),
          `${setup.name}: on the screen`,
        ).toBeLessThanOrEqual(TOLERANCE_PX)
      }
    })
  }
})
