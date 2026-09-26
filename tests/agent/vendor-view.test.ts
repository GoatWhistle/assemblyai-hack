import { describe, expect, it } from "vitest"
import { KEY_FINGERPRINT_LENGTH, keyFingerprint, VENDOR_HOSTS, vendorView } from "@/agent"

describe("the vendor view a deployment reports about itself", () => {
  it("fingerprints the key without carrying any of it", () => {
    const key = "a8e3000000000000000000000000beef"
    const print = keyFingerprint(key)
    expect(print).toHaveLength(KEY_FINGERPRINT_LENGTH)
    expect(key).not.toContain(String(print))
    expect(keyFingerprint(` ${key} `)).toBe(print)
    expect(keyFingerprint("")).toBeNull()
    expect(keyFingerprint(undefined)).toBeNull()
  })

  it("names the addresses each vendor host resolved to, sorted", async () => {
    const view = await vendorView({ apiKey: "k", region: "iad1" }, async (host) =>
      host === VENDOR_HOSTS.agents ? ["52.0.0.2", "52.0.0.1"] : ["3.0.0.1"],
    )
    expect(view.agentsHostAddresses).toEqual(["52.0.0.1", "52.0.0.2"])
    expect(view.streamingHostAddresses).toEqual(["3.0.0.1"])
    expect(view.region).toBe("iad1")
  })

  it("reports an empty list rather than failing when a lookup throws", async () => {
    const view = await vendorView({ apiKey: undefined, region: undefined }, async () => {
      throw new Error("ENOTFOUND")
    })
    expect(view.agentsHostAddresses).toEqual([])
    expect(view.keyFingerprint).toBeNull()
    expect(view.region).toBeNull()
  })
})
