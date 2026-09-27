import type { MetadataRoute } from "next"
import { INDEXED_ROUTES } from "@/site/routes"
import { absoluteUrl } from "@/site/site-url"

export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXED_ROUTES.map((route) => ({
    url: absoluteUrl(route.path),
    changeFrequency: "weekly",
    priority: route.priority,
  }))
}
