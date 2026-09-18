#!/usr/bin/env -S npx tsx

import { buildAgentDefinition } from "@/agent"
import { doctorExitCode, runAllChecks } from "./doctor-checks"

function requireEnv(name: string): string | null {
  const value = process.env[name]
  if (value === undefined || value.trim().length === 0) {
    return null
  }
  return value
}

async function main(): Promise<void> {
  process.stdout.write("readback doctor: liveness of the stored agent and its tool webhooks\n")
  process.stdout.write(
    "cost: this makes ordinary HTTPS requests only, it never opens a streaming or agent WebSocket, so it is free\n\n",
  )

  const key = requireEnv("ASSEMBLYAI_API_KEY")
  const agentId = requireEnv("ASSEMBLYAI_AGENT_ID")
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const secret = process.env.AGENT_TOOL_SECRET ?? "unset"

  const definition = buildAgentDefinition({ baseUrl, toolSecret: secret })

  const results = await runAllChecks({
    key,
    agentId,
    tools: definition.tools,
    doFetch: (url, init) => fetch(url, init),
  })

  process.stdout.write("| Check | Result | Detail |\n")
  process.stdout.write("|---|---|---|\n")
  for (const result of results) {
    process.stdout.write(
      `| ${result.name} | ${result.ok ? "PASS" : "FAIL"} | ${result.detail} |\n`,
    )
  }

  const failed = results.filter((result) => !result.ok)
  process.stdout.write("\n")
  if (results.length === 0) {
    process.stdout.write("no checks ran at all, which is not the same as passing\n")
  } else if (failed.length > 0) {
    process.stdout.write(`${failed.length} of ${results.length} checks FAILED\n`)
    for (const result of failed) {
      process.stdout.write(`  FAIL: ${result.name}: ${result.detail}\n`)
    }
  } else {
    process.stdout.write(`all ${results.length} checks passed\n`)
  }

  process.exit(doctorExitCode(results))
}

main().catch((error: unknown) => {
  console.error(`doctor crashed before finishing: ${String(error)}`)
  process.exit(1)
})
