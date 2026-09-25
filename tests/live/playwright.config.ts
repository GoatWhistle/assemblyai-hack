import { defineConfig, devices } from "@playwright/test"
import { liveSmokeRefusal, URL_VARIABLE } from "./live-guard"

const refusal = liveSmokeRefusal(process.env)
if (refusal !== null) {
  throw new Error(refusal)
}

// biome-ignore lint/style/noDefaultExport: Playwright reads its configuration from the default export
export default defineConfig({
  testDir: ".",
  testMatch: "live-smoke.spec.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 300_000,
  reporter: [["list"]],
  use: {
    baseURL: process.env[URL_VARIABLE],
    extraHTTPHeaders: { "ngrok-skip-browser-warning": "1" },
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-fake-caller",
      use: {
        ...devices["Desktop Chrome"],
        userAgent: "readback-live-smoke",
        launchOptions: {
          args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--autoplay-policy=no-user-gesture-required",
          ],
        },
        permissions: ["microphone"],
      },
    },
  ],
})
