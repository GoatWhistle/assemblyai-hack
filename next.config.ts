import type { NextConfig } from "next"

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://streaming.assemblyai.com wss://streaming.assemblyai.com https://agents.us.assemblyai.com wss://agents.us.assemblyai.com",
  "media-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ")

const BASE_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "microphone=(self), camera=(), geolocation=(), payment=(), usb=()",
  },
]

const PRODUCTION_HEADERS = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
]

export const JUDGE_ENTRY_REDIRECTS = [
  {
    source: "/",
    has: [{ type: "query" as const, key: "judge", value: "1" }],
    destination: "/demo?autoplay=1#replay",
    permanent: true,
  },
]

export const SERVER_DATA_FILES = {
  "/api/**/*": ["./data/catalog.json"],
}

const config: NextConfig = {
  reactStrictMode: true,
  outputFileTracingIncludes: SERVER_DATA_FILES,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    typedEnv: true,
  },
  async redirects() {
    return JUDGE_ENTRY_REDIRECTS
  },
  async headers() {
    const production = process.env.NODE_ENV === "production"
    return [
      {
        source: "/(.*)",
        headers: production ? [...BASE_HEADERS, ...PRODUCTION_HEADERS] : BASE_HEADERS,
      },
      {
        source: "/worklets/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600, must-revalidate" }],
      },
    ]
  },
}

export default config
