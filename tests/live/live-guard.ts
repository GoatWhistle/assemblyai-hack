export const CONFIRM_VARIABLE = "LIVE_SMOKE_CONFIRM_PAID"
export const URL_VARIABLE = "LIVE_SMOKE_URL"

export const PAID_NOTICE =
  "make live-smoke opens real AssemblyAI sockets and bills both of them: about $5.10 per hour of call time, several minutes per scenario."

const LOCAL_HOSTS: readonly string[] = ["localhost", "127.0.0.1", "0.0.0.0", "[::1]"]

export function liveSmokeRefusal(
  env: Readonly<Record<string, string | undefined>>,
): string | null {
  if (env[CONFIRM_VARIABLE] !== "1") {
    return `live smoke refused: ${CONFIRM_VARIABLE} is not 1. ${PAID_NOTICE} Set ${CONFIRM_VARIABLE}=1 only when that spend is approved.`
  }
  const raw = env[URL_VARIABLE]?.trim() ?? ""
  if (raw.length === 0) {
    return `live smoke refused: ${URL_VARIABLE} is not set. Point it at a preview deployment.`
  }
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return `live smoke refused: ${URL_VARIABLE} is not a URL (${raw}).`
  }
  if (url.protocol !== "https:") {
    return `live smoke refused: ${URL_VARIABLE} must be https, because the agent calls its tools over HTTPS (${raw}).`
  }
  if (LOCAL_HOSTS.includes(url.hostname)) {
    return `live smoke refused: ${URL_VARIABLE} points at this machine, which the vendor cannot reach for tool calls (${raw}).`
  }
  return null
}
