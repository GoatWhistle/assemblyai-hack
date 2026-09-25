import { vi } from "vitest"
import { createMemoryBudget, installDailyBudget, resetClientBudgets } from "@/sessions"
import { createMemoryEventStore, installIntakeEventStore } from "@/tools"

export const VENDOR_KEY = "a-real-looking-key"
export const VENDOR_TOOL_SECRET = "a-tool-secret-long-enough-to-pass"
export const AGENTS_URL_PREFIX = "https://agents.assemblyai.com/v1/agents"
export const AGENT_TOKEN_URL_PREFIX = "https://agents.assemblyai.com/v1/token"
export const STT_TOKEN_URL_PREFIX = "https://streaming.assemblyai.com/v3/token"

export type VendorCall = {
  readonly url: string
  readonly method: string
  readonly authorization: string
  readonly body: string | null
}

export type VendorStub = {
  readonly calls: VendorCall[]
  tokenCalls(): VendorCall[]
  agentCreations(): VendorCall[]
}

export type VendorAnswers = {
  token?: () => Response
  agent?: () => Response
}

let agentCounter = 0

export function stubVendor(answers: VendorAnswers = {}): VendorStub {
  const calls: VendorCall[] = []
  globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
    const given = (init?.headers ?? {}) as Record<string, string>
    const call: VendorCall = {
      url: String(url),
      method: init?.method ?? "GET",
      authorization: given.Authorization ?? "",
      body: typeof init?.body === "string" ? init.body : null,
    }
    calls.push(call)
    if (call.url.startsWith(AGENTS_URL_PREFIX)) {
      agentCounter += 1
      return answers.agent?.() ?? Response.json({ agent_id: `agent-${agentCounter}` })
    }
    return answers.token?.() ?? Response.json({ token: "minted" })
  }) as typeof fetch
  return {
    calls,
    tokenCalls: () => calls.filter((call) => !call.url.startsWith(AGENTS_URL_PREFIX)),
    agentCreations: () => calls.filter((call) => call.url.startsWith(AGENTS_URL_PREFIX)),
  }
}

export function freshServerState(budgetSeconds = 1_000_000): void {
  installIntakeEventStore(createMemoryEventStore())
  installDailyBudget(createMemoryBudget(budgetSeconds))
  vi.stubEnv("READBACK_DAILY_BUDGET_SECONDS", String(budgetSeconds))
  resetClientBudgets()
}

export function configureVendorEnv(): void {
  vi.stubEnv("ASSEMBLYAI_API_KEY", VENDOR_KEY)
  vi.stubEnv("AGENT_TOOL_SECRET", VENDOR_TOOL_SECRET)
}

export function agentTokenRequest(sessionId?: string): Request {
  const url = new URL("https://readback.example.com/api/tokens/agent")
  if (sessionId !== undefined) {
    url.searchParams.set("sessionId", sessionId)
  }
  return new Request(url)
}
