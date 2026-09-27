import { absoluteUrl, SITE_NAME } from "./site-url"

export const APPLICATION_DESCRIPTION =
  "A voice agent for prescription intake that proves it did not mishear. A technology demonstration, not a medical device: synthetic data only, no real patients and no real prescriptions."

export function structuredData() {
  const home = absoluteUrl("/")
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${home}#website`,
        name: SITE_NAME,
        url: home,
        inLanguage: "en",
      },
      {
        "@type": "WebApplication",
        "@id": `${home}#application`,
        name: SITE_NAME,
        url: home,
        description: APPLICATION_DESCRIPTION,
        applicationCategory: "HealthApplication",
        operatingSystem: "Any modern web browser",
        browserRequirements: "A live call needs a microphone; the replay needs none.",
        isAccessibleForFree: true,
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        inLanguage: "en",
        isPartOf: { "@id": `${home}#website` },
      },
    ],
  }
}

export function serializeStructuredData(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c")
}

export function StructuredData() {
  // biome-ignore lint/style/useNamingConvention: React fixes the name of this property
  const markup = { __html: serializeStructuredData(structuredData()) }
  return (
    <script
      type="application/ld+json"
      // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must reach the page unescaped, and the payload is our own constant with every angle bracket escaped
      dangerouslySetInnerHTML={markup}
    />
  )
}
