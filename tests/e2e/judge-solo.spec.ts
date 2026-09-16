import { expect, test } from "@playwright/test"

test.describe("judge-solo flow", () => {
  test("the demonstration runs from a single click without a microphone", async ({ page }) => {
    await page.goto("/demo")
    await expect(
      page.getByRole("heading", { name: /forty-second demonstration/i }),
    ).toBeVisible()
    await expect(page.getByText(/Ground truth for this recording/i)).toBeVisible()
    await page.getByRole("button", { name: /Play the recorded session/i }).click()
    await expect(page.getByRole("button", { name: /^Stop$/ })).toBeEnabled()
    await expect(page.getByText("bisoprolol 10 mg")).toBeVisible({ timeout: 20000 })
  })

  test("both arms of the contrast are visible side by side", async ({ page }) => {
    await page.goto("/demo")
    await expect(page.getByRole("region", { name: "Gate on" })).toBeVisible()
    await expect(page.getByRole("region", { name: "Gate off" })).toBeVisible()
  })

  test("the demonstration page carries the medical disclaimer", async ({ page }) => {
    await page.goto("/demo")
    await expect(page.getByText(/not a medical device/i)).toBeVisible()
    await expect(page.getByText(/Synthetic data only/i)).toBeVisible()
  })

  test("the gate banner names the LASA reason code once the decision is reached", async ({
    page,
  }) => {
    await page.goto("/demo")
    await page.getByRole("button", { name: /Play the recorded session/i }).click()
    await expect(page.getByText("E_LASA_HIT").first()).toBeVisible({ timeout: 20000 })
    await expect(page.getByText(/Confidence does not decide this field/i)).toBeVisible()
  })
})

test.describe("navigation between the three surfaces", () => {
  test("the intake screen reaches the demonstration and the measurements", async ({ page }) => {
    await page.goto("/")
    await expect(page.getByText("Readback")).toBeVisible()
    await page.getByRole("link", { name: /Measurements/i }).click()
    await expect(page.getByRole("heading", { name: "Measurements" })).toBeVisible()
    await page.getByRole("link", { name: /Recorded demonstration/i }).click()
    await expect(
      page.getByRole("heading", { name: /forty-second demonstration/i }),
    ).toBeVisible()
  })

  test("every published figure carries the command that produced it", async ({ page }) => {
    await page.goto("/metrics")
    await expect(page.getByText("False-ask rate")).toBeVisible()
    await expect(page.getByText("make eval").first()).toBeVisible()
    await expect(
      page.getByText(/A number without a method is not published here/i),
    ).toBeVisible()
  })

  test("the close-code table lists the two alert-worthy codes", async ({ page }) => {
    await page.goto("/metrics")
    await expect(page.getByRole("cell", { name: /3008/ })).toBeVisible()
    await expect(page.getByRole("cell", { name: /3009/ })).toBeVisible()
  })
})

test.describe("the intake screen at phone width", () => {
  test("does not scroll horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 400, height: 900 })
    await page.goto("/")
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })

  test("keeps the field card readable with its proof and certainty stacked", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 400, height: 900 })
    await page.goto("/")
    await expect(page.getByText("What proves this value").first()).toBeVisible()
    await expect(
      page.getByText("What the recognizer claims about itself").first(),
    ).toBeVisible()
  })
})

test.describe("keyboard reachability", () => {
  test("the skip link leads to the order", async ({ page }) => {
    await page.goto("/")
    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: /Skip to the order/i })).toBeFocused()
  })
})
