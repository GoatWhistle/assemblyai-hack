import type { Metadata, Viewport } from "next"
import { Manrope } from "next/font/google"
import type { ReactNode } from "react"
import { RouteTransition } from "@/shared/ui/motion/route-transition"
import "@/styles/global.css"

const manrope = Manrope({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-brand",
  weight: ["400", "500", "600"],
})

const DESCRIPTION =
  "A voice agent for prescription intake that proves it did not mishear: per-field provenance, confidence, and a gate that refuses unverified values."

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"

const BROWSER_CHROME_COLOR = "white"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Readback",
    template: "%s · Readback",
  },
  description: DESCRIPTION,
  applicationName: "Readback",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: {
    title: "Readback",
    description: DESCRIPTION,
    type: "website",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Readback" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Readback",
    description: DESCRIPTION,
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
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <RouteTransition />
        {children}
      </body>
    </html>
  )
}
