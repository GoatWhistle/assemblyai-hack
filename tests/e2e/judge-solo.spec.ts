import { expect, test } from "@playwright/test"

test.describe("a judge alone, with no microphone and no key", () => {
  test("the root is the first screen and names both ways in", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible()
    await expect(page.getByText(/who pays/i)).toBeVisible()
    await expect(page.getByText(/who gets the order/i)).toBeVisible()
    await expect(page.getByRole("link", { name: /watch the 40-second case/i })).toHaveAttribute(
      "href",
      "/?judge=1#replay",
    )
    await expect(page.getByRole("link", { name: /talk to it live/i })).toHaveAttribute(
      "href",
      "/live",
    )
    await expect(page.getByRole("region", { name: "Say these three things" })).toBeVisible()
    await expect(page.getByText(/not a medical device/i).first()).toBeVisible()
  })

  test("?judge=1 opens the replay, which reaches RE-ASK at certainty 1.00 on its own", async ({
    page,
  }) => {
    await page.goto("/?judge=1")
    await expect(page.getByRole("region", { name: "Replay" }).first()).toBeVisible()
    const replay = page.getByRole("region", { name: "Replay" }).first()
    await expect(replay.getByText(/candidates: Hydromorphone \/ Morphine/).first()).toBeVisible(
      {
        timeout: 20000,
      },
    )
    await expect(replay.getByText("RE-ASK").first()).toBeVisible()
    await expect(replay.getByText("certainty 1.00").first()).toBeVisible()
    await expect(replay.getByText("E_LASA_HIT").first()).toBeVisible()
  })

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

  test("old /start links land on the replay", async ({ page }) => {
    await page.goto("/start")
    await expect(page).toHaveURL(/\/\?judge=1/)
  })

  test("the live page opens without starting a call", async ({ page }) => {
    await page.goto("/live")
    await expect(page.getByRole("button", { name: "Start listening" })).toBeVisible()
    await expect(page.getByRole("link", { name: /run the replay/i })).toBeVisible()
  })
})

test.describe("with scripts disabled", () => {
  test.use({ javaScriptEnabled: false })

  test("both entry links are real links that navigate", async ({ page }) => {
    await page.goto("/")
    await page.getByRole("link", { name: /watch the 40-second case/i }).click()
    await expect(page).toHaveURL(/\/\?judge=1#replay$/)
    await expect(page.getByRole("region", { name: "Replay" }).first()).toBeVisible()
    await page.goto("/")
    await page.getByRole("link", { name: /talk to it live/i }).click()
    await expect(page).toHaveURL(/\/live$/)
  })

  test("the three things to say and their reason codes are server-rendered", async ({
    page,
  }) => {
    await page.goto("/")
    const block = page.getByRole("region", { name: "Say these three things" })
    await expect(block.getByText("E_LASA_HIT")).toBeVisible()
    await expect(block.getByText("E_VALIDATOR_CHECKSUM")).toBeVisible()
  })
})

test.describe("keyboard reachability", () => {
  test("the skip link is the first stop on the root", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /skip to the content/i })).toBeFocused()
  })

  test("the skip link leads to the order on the live page", async ({ page }) => {
    await page.goto("/live")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /skip to the order/i })).toBeFocused()
  })
})
