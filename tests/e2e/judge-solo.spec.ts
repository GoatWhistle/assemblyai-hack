import { expect, test } from "@playwright/test"

const REPLAY_ENTRY = "/demo?autoplay=1#replay"

test.describe("a judge alone, with no microphone and no key", () => {
  test("the root is the call, with one visible step to the replay", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible()
    await expect(
      page.getByRole("link", { name: /judging\? watch the \d+-second replay/i }),
    ).toHaveAttribute("href", REPLAY_ENTRY)
    await expect(page.getByText(/not a medical device/i).first()).toBeVisible()
  })

  test("the judge hub names both ways in and the business case", async ({ page }) => {
    await page.goto("/demo")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await page.getByText("The mechanism and the business case").click()
    await expect(page.getByText(/who pays/i)).toBeVisible()
    await expect(page.getByText(/who gets the order/i)).toBeVisible()
    await expect(
      page.getByRole("link", { name: /watch the \d+-second replay/i }).first(),
    ).toHaveAttribute("href", REPLAY_ENTRY)
    await expect(page.getByRole("link", { name: /^start a call$/i }).first()).toHaveAttribute(
      "href",
      "/",
    )
    await expect(page.getByRole("region", { name: "Say these three things" })).toBeVisible()
    await expect(page.getByText(/not a medical device/i).first()).toBeVisible()
  })

  for (const entry of ["/?judge=1", REPLAY_ENTRY]) {
    test(`${entry} opens the replay, which reaches RE-ASK at certainty 1.00 on its own`, async ({
      page,
    }) => {
      await page.goto(entry)
      await expect(page).toHaveURL(/\/demo\?(?:.*&)?autoplay=1/)
      const replay = page.getByRole("region", { name: "Replay" }).first()
      await expect(replay).toBeVisible()
      await expect(
        replay.getByText(/candidates: Hydromorphone \/ Morphine/).first(),
      ).toBeVisible({
        timeout: 20000,
      })
      await expect(replay.getByText("RE-ASK", { exact: true }).first()).toBeVisible()
      await expect(replay.getByText("certainty 1.00").first()).toBeVisible()
      await expect(replay.getByText("E_LASA_HIT").first()).toBeVisible()
    })
  }

  test("the replay plays from one click; a yes writes the wrong drug and a spoken name the right one", async ({
    page,
  }) => {
    await page.goto("/demo")
    await page.getByRole("button", { name: /play the replay/i }).click()
    await expect(page.getByRole("button", { name: /^Stop$/ }).first()).toBeEnabled()
    await expect(
      page.getByText("morphine 2 mg/mL injection, intravenous", { exact: true }).first(),
    ).toBeVisible({
      timeout: 20000,
    })
    await expect(
      page.getByText("hydromorphone 2 mg/mL injection, intravenous", { exact: true }).first(),
    ).toBeVisible()
    await expect(page.getByRole("region", { name: "Pair rule on" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Pair rule off" })).toBeVisible()
  })

  for (const size of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
  ]) {
    test(`the autoplay entry shows both arms' verdicts without scrolling at ${size.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await page.goto(REPLAY_ENTRY)
      const strip = page.getByRole("region", { name: "What each arm does with the same words" })
      await expect(strip).toBeInViewport({ ratio: 1, timeout: 5000 })
      await expect(strip.getByText(/RE-ASK at certainty 1\.00/)).toBeVisible({ timeout: 20000 })
      await expect(strip).toBeInViewport({ ratio: 1 })
    })
  }

  test("old /start links land on the replay", async ({ page }) => {
    await page.goto("/start")
    await expect(page).toHaveURL(/\/demo\?autoplay=1#replay$/)
  })

  test("old /live links land on the call without starting it", async ({ page }) => {
    await page.goto("/live")
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible()
    await expect(page.getByText("Technical details")).toBeVisible()
  })
})

test.describe("with scripts disabled", () => {
  test.use({ javaScriptEnabled: false })

  test("both entry links are real links that navigate", async ({ page }) => {
    test.setTimeout(90000)
    await page.goto("/demo")
    await page
      .getByRole("link", { name: /watch the \d+-second replay/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/demo\?autoplay=1#replay$/)
    await expect(page.getByRole("region", { name: "Replay" }).first()).toBeVisible()
    await page.goto("/demo")
    await page
      .getByRole("link", { name: /^start a call$/i })
      .first()
      .click()
    await expect(page).toHaveURL(/\/$/)
    await page.getByRole("link", { name: /judging\? watch the \d+-second replay/i }).click()
    await expect(page).toHaveURL(/\/demo\?autoplay=1#replay$/)
  })

  test("the three things to say and their reason codes are server-rendered", async ({
    page,
  }) => {
    await page.goto("/demo")
    const block = page.getByRole("region", { name: "Say these three things" })
    await expect(block.getByText("E_LASA_HIT")).toBeVisible()
    await expect(block.getByText("E_VALIDATOR_CHECKSUM")).toBeVisible()
  })
})

test.describe("keyboard reachability", () => {
  test("the skip link is the first stop on the call page and leads to it", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /skip to the call/i })).toBeFocused()
  })

  test("the skip link moves the keyboard into the call with motion allowed", async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "no-preference" })
    await page.goto("/")
    await page.keyboard.press("Tab")
    await page.keyboard.press("Enter")
    await expect(page).toHaveURL(/#main$/)
    await page.keyboard.press("Tab")
    const landing = await page.evaluate(() => ({
      inMain: document.querySelector("main#main")?.contains(document.activeElement) ?? false,
      headerInMain: document.querySelector("main header") !== null,
    }))
    expect(
      landing.inMain,
      "the route transition swallowed #main, so the next Tab went back to the header (r1-A2 F1)",
    ).toBe(true)
    expect(
      landing.headerInMain,
      "the banner sits outside main, so the skip link skips it",
    ).toBe(false)
  })

  test("a refused microphone stays on the call page with one card and a retry", async ({
    browser,
  }) => {
    const context = await browser.newContext({ permissions: [] })
    const page = await context.newPage()
    await page.addInitScript(() => {
      navigator.mediaDevices.getUserMedia = () =>
        Promise.reject(new DOMException("Permission denied", "NotAllowedError"))
    })
    await page.goto("/")
    await page.getByRole("button", { name: "Start listening" }).click()
    const card = page.getByRole("alert")
    await expect(card).toHaveCount(1)
    const title = card.getByRole("heading", { name: /permission was refused/i })
    await expect(title).toBeVisible()
    await expect(title, "focus lands on the card so a screen reader starts there").toBeFocused()
    await expect(card.getByRole("button", { name: "Try again" })).toBeInViewport()
    await expect(
      card.getByRole("link", { name: /replay/i }),
      "the fault card offers the retry only",
    ).toHaveCount(0)
    await expect(page.getByRole("banner")).not.toContainText(/blocked/i)
    await page.waitForTimeout(9500)
    await expect(page, "a microphone fault never moves the caller off the call page").toHaveURL(
      /\/$/,
    )
    await context.close()
  })

  test("the skip link on the judge hub leads to the replay", async ({ page }) => {
    await page.goto("/demo")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /skip to the replay/i })).toBeFocused()
  })
})
