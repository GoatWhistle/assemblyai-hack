export type ToolBaseUrl =
  | { readonly ok: true; readonly url: string; readonly source: ToolBaseSource }
  | { readonly ok: false; readonly reason: string }

export type ToolBaseSource = "configured" | "platform" | "request"

export const TOOL_BASE_URL_UNSET =
  "NEXT_PUBLIC_APP_URL is not set in production and the platform names no deployment URL; the agent's tools carry the tool secret in their headers, so their host is never taken from the request, whose origin a client can influence"

function present(value: string | undefined): string | null {
  return value === undefined || value.trim().length === 0 ? null : value.trim()
}

function parsed(value: string): string | null {
  try {
    const url = new URL(value)
    return url.protocol === "https:" || url.protocol === "http:" ? url.origin : null
  } catch {
    return null
  }
}

function platformHost(env: Record<string, string | undefined>): string | null {
  if (env.VERCEL_ENV === "production") {
    return present(env.VERCEL_PROJECT_PRODUCTION_URL) ?? present(env.VERCEL_URL)
  }
  return present(env.VERCEL_URL)
}

export function toolBaseUrl(
  env: Record<string, string | undefined>,
  requestOrigin: string,
): ToolBaseUrl {
  const configured = present(env.NEXT_PUBLIC_APP_URL)
  if (configured !== null) {
    const url = parsed(configured)
    return url === null
      ? { ok: false, reason: "NEXT_PUBLIC_APP_URL is not an http or https URL" }
      : { ok: true, url, source: "configured" }
  }
  const host = platformHost(env)
  if (host !== null) {
    const url = parsed(`https://${host}`)
    if (url !== null) {
      return { ok: true, url, source: "platform" }
    }
  }
  if (env.NODE_ENV !== "production") {
    return { ok: true, url: requestOrigin, source: "request" }
  }
  return { ok: false, reason: TOOL_BASE_URL_UNSET }
}
