import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import type { ReactNode } from "react"
import { RouteTransition } from "@/shared/ui/motion/route-transition"
import { OG_IMAGE, TITLE_TEMPLATE } from "@/site/page-metadata"
import { SITE_NAME, SITE_URL } from "@/site/site-url"
import "@/styles/global.css"

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand",
  weight: ["400", "500", "600"],
})

const DESCRIPTION =
  "A voice agent for prescription intake that proves it did not mishear: per-field provenance, confidence, and a gate that refuses unverified values."

const BROWSER_CHROME_COLOR = "white"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: SITE_NAME,
    template: TITLE_TEMPLATE,
  },
  description: DESCRIPTION,
  applicationName: SITE_NAME,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/icons/icon-96.png", sizes: "96x96", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    title: SITE_NAME,
    statusBarStyle: "default",
  },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_NAME,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: DESCRIPTION,
    images: [OG_IMAGE],
  },
  other: {
    "format-detection": "telephone=no",
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: BROWSER_CHROME_COLOR,
  colorScheme: "light",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={manrope.variable}>
      <body>
        <RouteTransition />
        {children}
      </body>
    </html>
  )
}
