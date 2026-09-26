import { createHash } from "node:crypto"
import type { VendorView } from "@/domain"

export const VENDOR_HOSTS = {
  agents: "agents.assemblyai.com",
  streaming: "streaming.assemblyai.com",
} as const

export const KEY_FINGERPRINT_LENGTH = 12

const LOOKUP_TIMEOUT_MS = 1500

export type HostLookup = (host: string) => Promise<readonly string[]>

export function keyFingerprint(key: string | undefined): string | null {
  const value = key?.trim() ?? ""
  if (value.length === 0) {
    return null
  }
  return createHash("sha256").update(value).digest("hex").slice(0, KEY_FINGERPRINT_LENGTH)
}

async function addressesOf(host: string, lookup: HostLookup): Promise<readonly string[]> {
  const timeout = new Promise<readonly string[]>((resolve) => {
    setTimeout(() => resolve([]), LOOKUP_TIMEOUT_MS)
  })
  try {
    const found = await Promise.race([lookup(host), timeout])
    return [...found].sort()
  } catch {
    return []
  }
}

export async function vendorView(
  input: { readonly apiKey: string | undefined; readonly region: string | undefined },
  lookup: HostLookup,
): Promise<VendorView> {
  const [agents, streaming] = await Promise.all([
    addressesOf(VENDOR_HOSTS.agents, lookup),
    addressesOf(VENDOR_HOSTS.streaming, lookup),
  ])
  return {
    keyFingerprint: keyFingerprint(input.apiKey),
    agentsHostAddresses: agents,
    streamingHostAddresses: streaming,
    region: input.region?.trim() || null,
  }
}
