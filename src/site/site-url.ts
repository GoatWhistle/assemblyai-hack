export const SITE_NAME = "Readback"

export const LOCAL_URL = "http://localhost:3000"

type SiteEnv = {
  readonly appUrl?: string | undefined
  readonly productionHost?: string | undefined
}

function withoutTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "")
}

export function resolveSiteUrl(env: SiteEnv): string {
  const configured = env.appUrl?.trim()
  if (configured) {
    return withoutTrailingSlash(configured)
  }
  const production = env.productionHost?.trim()
  if (production) {
    return withoutTrailingSlash(`https://${production}`)
  }
  return LOCAL_URL
}

export const SITE_URL = resolveSiteUrl({
  appUrl: process.env.NEXT_PUBLIC_APP_URL,
  productionHost: process.env.VERCEL_PROJECT_PRODUCTION_URL,
})

export function absoluteUrl(path: string): string {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`
}
