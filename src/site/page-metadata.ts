import type { Metadata } from "next"
import { absoluteUrl, SITE_NAME } from "./site-url"

export const TITLE_SEPARATOR = " | "

export const TITLE_TEMPLATE = `%s${TITLE_SEPARATOR}${SITE_NAME}`

export const OG_IMAGE = Object.freeze({
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "Readback: prescription intake that asks again when a drug name has a look-alike, even at recognizer certainty 1.00.",
})

export const FORBIDDEN_TITLE_SEPARATOR = /[—–·•‧∙]|\s-\s|\s-$|^-\s/

type PageMetadataInput = {
  readonly title: string
  readonly description: string
  readonly path?: string
  readonly absoluteTitle?: boolean
  readonly robots?: Metadata["robots"]
}

export function fullTitle(title: string): string {
  return TITLE_TEMPLATE.replace("%s", title)
}

export function pageMetadata(input: PageMetadataInput): Metadata {
  const shown = input.absoluteTitle ? input.title : fullTitle(input.title)
  const url = input.path === undefined ? undefined : absoluteUrl(input.path)
  return {
    title: input.absoluteTitle ? { absolute: input.title } : input.title,
    description: input.description,
    ...(input.path === undefined ? {} : { alternates: { canonical: input.path } }),
    ...(input.robots === undefined ? {} : { robots: input.robots }),
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      title: shown,
      description: input.description,
      ...(url === undefined ? {} : { url }),
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title: shown,
      description: input.description,
      images: [OG_IMAGE],
    },
  }
}
