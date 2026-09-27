import { readFileSync } from "node:fs"
import { expect, test } from "@playwright/test"
import { type InjectorLog, injectorScript } from "../live/caller-injector"
import { lineFile } from "../live/lines"

const HARNESS_PAGE = "https://caller-injector.test/"

test("S4: the scripted caller is heard on the page's microphone track after reply.done, with no socket opened", async ({
  page,
}) => {
  await page.route(HARNESS_PAGE, (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>harness</title>" }),
  )
  const agent: { push: ((frame: object) => void) | null } = { push: null }
  await page.routeWebSocket(/agents(\.us)?\.assemblyai\.com/, (socket) => {
    agent.push = (frame) => socket.send(JSON.stringify(frame))
  })
  await page.addInitScript({
    content: injectorScript({
      agentHost: "agents.us.assemblyai.com",
      steps: [{ line: "yes", trigger: "reply-done", delayMs: 100 }],
      lines: { yes: readFileSync(lineFile("yes")).toString("base64") },
    }),
  })
  await page.goto(HARNESS_PAGE)

  await page.evaluate(async () => {
    const scope = window as unknown as { probe: { peak: number }; agent: WebSocket }
    scope.probe = { peak: 0 }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const listener = new AudioContext()
    const analyser = listener.createAnalyser()
    listener.createMediaStreamSource(stream).connect(analyser)
    const samples = new Float32Array(analyser.fftSize)
    const sample = () => {
      analyser.getFloatTimeDomainData(samples)
      scope.probe.peak = Math.max(scope.probe.peak, ...samples.map(Math.abs))
      requestAnimationFrame(sample)
    }
    sample()
    scope.agent = new WebSocket("wss://agents.us.assemblyai.com/v1/ws?token=proof")
    await new Promise((resolve) => scope.agent.addEventListener("open", resolve))
  })
  await expect.poll(() => agent.push !== null).toBe(true)

  const peak = () =>
    page.evaluate(() => (window as unknown as { probe: { peak: number } }).probe.peak)
  const injected = () =>
    page.evaluate(
      () =>
        (window as unknown as { readbackCallerInjector: InjectorLog }).readbackCallerInjector,
    )

  await page.waitForTimeout(500)
  expect(await peak(), "silence before the agent has finished").toBe(0)

  agent.push?.({ type: "reply.started" })
  agent.push?.({ type: "transcript.agent", text: "Hello, which prescription is this?" })
  agent.push?.({ type: "reply.done", status: "completed" })

  await expect.poll(async () => (await injected()).played.length).toBe(1)
  await expect.poll(peak, { timeout: 5000 }).toBeGreaterThan(0.01)
  const log = await injected()
  expect(log.errors).toEqual([])
  expect(log.finished).toBe(true)
  expect(log.events.map((event) => event.type)).toEqual([
    "reply.started",
    "transcript.agent",
    "reply.done",
  ])
})
