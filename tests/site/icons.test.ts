import { readFileSync } from "node:fs"
import manifest from "@app/manifest"
import { describe, expect, it } from "vitest"

type Png = { readonly width: number; readonly height: number; readonly alpha: boolean }

function png(path: string): Png {
  const bytes = readFileSync(path)
  expect(bytes.subarray(1, 4).toString("latin1"), path).toBe("PNG")
  const colourType = bytes.readUInt8(25)
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
    alpha: colourType === 4 || colourType === 6,
  }
}

function icoSizes(path: string): readonly number[] {
  const bytes = readFileSync(path)
  const count = bytes.readUInt16LE(4)
  return Array.from({ length: count }, (_, index) => bytes.readUInt8(6 + index * 16) || 256)
}

const LAYOUT = readFileSync("app/layout.tsx", "utf8")

describe("icons for every device", () => {
  it("serves every PNG the layout links at the size it declares", () => {
    const links = [...LAYOUT.matchAll(/url: "(\/[^"]+\.png)", sizes: "(\d+)x(\d+)"/g)]
    expect(links.length).toBeGreaterThanOrEqual(6)
    for (const [, url, width, height] of links) {
      const image = png(`public${url}`)
      expect([image.width, image.height], url).toEqual([Number(width), Number(height)])
    }
  })

  it("serves every manifest icon at its declared size", () => {
    for (const icon of manifest().icons ?? []) {
      const path = `public${icon.src}`
      if (icon.type === "image/svg+xml") {
        expect(readFileSync(path, "utf8"), icon.src).toContain("<svg")
        continue
      }
      const image = png(path)
      expect(`${image.width}x${image.height}`, icon.src).toBe(icon.sizes)
    }
  })

  it("gives the maskable and Apple icons an opaque square, since the platform cuts the shape", () => {
    for (const path of [
      "public/icons/maskable-192.png",
      "public/icons/maskable-512.png",
      "public/apple-touch-icon.png",
    ]) {
      expect(png(path).alpha, path).toBe(false)
    }
    expect(png("public/apple-touch-icon.png")).toMatchObject({ width: 180, height: 180 })
  })

  it("packs 16, 32 and 48 into the ico", () => {
    expect([...icoSizes("public/favicon.ico")].sort((a, b) => a - b)).toEqual([16, 32, 48])
  })

  it("keeps the link preview image at 1200 by 630", () => {
    expect(png("public/og.png")).toMatchObject({ width: 1200, height: 630 })
  })
})
