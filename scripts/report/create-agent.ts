#!/usr/bin/env -S npx tsx

import { buildAgentDefinition } from "@/agent"

const AGENTS_URL = "https://agents.assemblyai.com/v1/agents"

function requireEnv(name: string): string {
  const value = process.env[name]
  if (value === undefined || value.trim().length === 0) {
    console.error(`${name} is not set; copy .env.example to .env.local and fill it in`)
    process.exit(1)
  }
  return value
}

function buildFromEnv(): ReturnType<typeof buildAgentDefinition> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  const definition = buildAgentDefinition({
    baseUrl,
    toolSecret: process.env.AGENT_TOOL_SECRET ?? "unset",
    model: process.env.AGENT_LLM_MODEL,
  })

  for (const tool of definition.tools) {
    if (!tool.http.url.startsWith("https://")) {
      console.warn(
        `tool ${tool.name} points at ${tool.http.url}; AssemblyAI rejects non-HTTPS and private hosts, so use a preview deployment or a tunnel`,
      )
    }
  }

  return definition
}

async function main(): Promise<void> {
  const definition = buildFromEnv()

  if (process.argv.includes("--print")) {
    console.log(JSON.stringify(definition, null, 2))
    return
  }

  const key = requireEnv("ASSEMBLYAI_API_KEY")

  const response = await fetch(AGENTS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(definition),
  })

  const text = await response.text()

  if (!response.ok) {
    console.error(`POST ${AGENTS_URL} returned ${response.status}`)
    console.error(text)
    process.exit(1)
    return
  }

  const parsed = JSON.parse(text) as { id?: string; agent_id?: string }
  const id = parsed.agent_id ?? parsed.id

  console.log(`agent created: ${id}`)
  console.log(`keyterms: ${definition.input.keyterms.length}`)
  console.log(`tools: ${definition.tools.map((t) => t.name).join(", ")}`)
  console.log("")
  console.log(`set ASSEMBLYAI_AGENT_ID=${id} in .env.local`)
}

main().catch((error: unknown) => {
  console.error(String(error))
  process.exit(1)
})
