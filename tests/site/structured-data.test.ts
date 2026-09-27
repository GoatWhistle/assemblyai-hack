import { describe, expect, it } from "vitest"
import { serializeStructuredData, structuredData } from "@/site/structured-data"

describe("structured data on the home page", () => {
  const data = structuredData()
  const graph = data["@graph"]
  const application = graph.find((node) => node["@type"] === "WebApplication")

  it("describes a free web application and says it is not a medical device", () => {
    expect(application).toMatchObject({
      name: "Readback",
      isAccessibleForFree: true,
      offers: { price: "0" },
    })
    expect(String(application?.description)).toMatch(/not a medical device/)
    expect(graph.some((node) => node["@type"] === "WebSite")).toBe(true)
  })

  it("serializes to JSON that cannot close its own script element", () => {
    const text = serializeStructuredData({ note: "</script><script>alert(1)</script>" })
    expect(text).not.toContain("<")
    expect(JSON.parse(text)).toEqual({ note: "</script><script>alert(1)</script>" })
    expect(JSON.parse(serializeStructuredData(data))).toEqual(data)
  })
})
