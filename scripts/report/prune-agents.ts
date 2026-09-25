#!/usr/bin/env -S npx tsx

import { AGENT_NAME_PREFIX } from "@/agent"

const AGENTS_URL = "https://agents.assemblyai.com/v1/agents"

const ORPHAN_TTL_HOURS = 24

type ListedAgent = {
  readonly id?: unknown
  readonly name?: unknown
  readonly created_at?: unknown
}

export function listedAgents(body: unknown): readonly ListedAgent[] {
  if (Array.isArray(body)) {
    return body as ListedAgent[]
  }
  const wrapped = (body as { agents?: unknown; data?: unknown } | null) ?? {}
  const list = wrapped.agents ?? wrapped.data
  return Array.isArray(list) ? (list as ListedAgent[]) : []
}

export function orphanedSessionAgents(
  agents: readonly ListedAgent[],
  nowMs: number,
  ttlHours = ORPHAN_TTL_HOURS,
): readonly string[] {
  return agents
    .filter((agent) => typeof agent.id === "string" && typeof agent.name === "string")
    .filter((agent) => String(agent.name).startsWith(`${AGENT_NAME_PREFIX}-`))
    .filter((agent) => {
      const created = Date.parse(String(agent.created_at ?? ""))
      return Number.isFinite(created) && nowMs - created > ttlHours * 3_600_000
    })
    .map((agent) => String(agent.id))
}

async function main(): Promise<void> {
  const key = process.env.ASSEMBLYAI_API_KEY?.trim() ?? ""
  if (key.length === 0) {
    console.error("ASSEMBLYAI_API_KEY is not set")
    process.exit(1)
    return
  }
  const apply = process.argv.includes("--apply")
  const headers = { Authorization: `Bearer ${key}` }
  const response = await fetch(AGENTS_URL, { headers })
  if (!response.ok) {
    console.error(`GET ${AGENTS_URL} answered ${response.status}`)
    process.exit(1)
    return
  }
  const orphans = orphanedSessionAgents(listedAgents(await response.json()), Date.now())
  console.log(`per-session agents older than ${ORPHAN_TTL_HOURS} h: ${orphans.length}`)
  for (const id of orphans) {
    if (!apply) {
      console.log(`  would delete ${id}`)
      continue
    }
    const deleted = await fetch(`${AGENTS_URL}/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers,
    })
    console.log(`  DELETE ${id}: ${deleted.status}`)
  }
  if (!apply) {
    console.log(
      "dry run; pass --apply to delete. Listing and deleting agents are ordinary HTTPS calls and open no socket",
    )
  }
}

if (process.argv[1]?.includes("prune-agents")) {
  void main()
}
