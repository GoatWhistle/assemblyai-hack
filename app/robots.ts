import type { MetadataRoute } from "next"
import { DISALLOWED_PATHS } from "@/site/routes"
import { absoluteUrl } from "@/site/site-url"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: [...DISALLOWED_PATHS] },
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
