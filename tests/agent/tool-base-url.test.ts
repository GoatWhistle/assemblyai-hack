import { GET as agentRoute } from "@app/api/tokens/agent/route"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { TOOL_BASE_URL_UNSET, toolBaseUrl } from "@/agent"
import {
  configureVendorEnv,
  freshServerState,
  stubVendor,
  VENDOR_TOOL_SECRET,
} from "../api/tokens/vendor-stub"

const ATTACKER = "https://attacker.example"

const original = globalThis.fetch

beforeEach(() => {
  configureVendorEnv()
  freshServerState()
})

afterEach(() => {
  globalThis.fetch = original
  vi.unstubAllEnvs()
})

describe("the host the agent's tools call, and therefore where the tool secret goes", () => {
  it("prefers the configured application URL over everything a request could carry", () => {
    const base = toolBaseUrl(
      { NEXT_PUBLIC_APP_URL: "https://readback.example.com/", NODE_ENV: "production" },
      ATTACKER,
    )
    expect(base).toEqual({
      ok: true,
      url: "https://readback.example.com",
      source: "configured",
    })
  })

  it("falls back to the production domain the platform names, never the request", () => {
    const base = toolBaseUrl(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        VERCEL_PROJECT_PRODUCTION_URL: "readback.vercel.app",
        VERCEL_URL: "readback-abc123.vercel.app",
      },
      ATTACKER,
    )
    expect(base).toEqual({ ok: true, url: "https://readback.vercel.app", source: "platform" })
  })

  it("points a preview deployment's tools at that preview, not at production", () => {
    const base = toolBaseUrl(
      {
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        VERCEL_PROJECT_PRODUCTION_URL: "readback.vercel.app",
        VERCEL_URL: "readback-abc123.vercel.app",
      },
      ATTACKER,
    )
    expect(base).toEqual({
      ok: true,
      url: "https://readback-abc123.vercel.app",
      source: "platform",
    })
  })

  it("refuses in production when nothing but the request names a host", () => {
    expect(toolBaseUrl({ NODE_ENV: "production" }, ATTACKER)).toEqual({
      ok: false,
      reason: TOOL_BASE_URL_UNSET,
    })
  })

  it("uses the request origin in development only", () => {
    expect(toolBaseUrl({ NODE_ENV: "development" }, "http://localhost:3000")).toEqual({
      ok: true,
      url: "http://localhost:3000",
      source: "request",
    })
  })

  it("refuses a configured value that is not an http URL instead of building tools on it", () => {
    const base = toolBaseUrl({ NEXT_PUBLIC_APP_URL: "javascript:alert(1)" }, ATTACKER)
    expect(base.ok).toBe(false)
  })

  it("the agent route in production sends no tool secret to a host named by the request", async () => {
    vi.stubEnv("NODE_ENV", "production")
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "")
    vi.stubEnv("VERCEL_URL", "")
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "")
    vi.stubEnv("READBACK_ALLOW_MEMORY_STORE", "1")
    const vendor = stubVendor()
    const response = await agentRoute(new Request(`${ATTACKER}/api/tokens/agent`))
    expect(response.status).toBe(500)
    expect((await response.json()).error).toBe(TOOL_BASE_URL_UNSET)
    expect(vendor.calls).toHaveLength(0)
  })

  it("the agent route builds every tool URL on the configured host even when the request names another", async () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://readback.example.com")
    const vendor = stubVendor()
    const response = await agentRoute(new Request(`${ATTACKER}/api/tokens/agent`))
    expect(response.status).toBe(200)
    const [creation] = vendor.agentCreations()
    const definition = JSON.parse(creation?.body ?? "{}") as {
      tools: { http: { url: string; headers: { name: string; value: string }[] } }[]
    }
    expect(definition.tools.length).toBeGreaterThan(0)
    for (const tool of definition.tools) {
      expect(new URL(tool.http.url).origin).toBe("https://readback.example.com")
      expect(tool.http.headers.map((header) => header.value)).toContain(VENDOR_TOOL_SECRET)
    }
    expect(creation?.body ?? "").not.toContain("attacker.example")
  })
})
