import { readFileSync } from "node:fs"

const BODY_MIN = 4.5
const EXEMPT = new Set(["action-disabled-ink"])

function oklchToSrgb(lightness, chroma, hue) {
  const h = (hue * Math.PI) / 180
  const a = chroma * Math.cos(h)
  const b = chroma * Math.sin(h)
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]
  return linear.map((u) => {
    const c = Math.min(1, Math.max(0, u))
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
  })
}

function relativeLuminance([r, g, b]) {
  const lin = (u) => (u <= 0.04045 ? u / 12.92 : ((u + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

function contrast(one, two) {
  const a = relativeLuminance(one)
  const b = relativeLuminance(two)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

function composite(foreground, alpha, backdrop) {
  return foreground.map((channel, index) => channel * alpha + backdrop[index] * (1 - alpha))
}

const COLOUR =
  /--([a-z0-9-]+):\s*oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*(?:\/\s*([\d.]+)\s*)?\)/g
const ALIAS = /--([a-z0-9-]+):\s*var\(--([a-z0-9-]+)\)/g

const palette = new Map()
const alphas = new Map()
for (const m of readFileSync("src/styles/tokens/palette.css", "utf8").matchAll(COLOUR)) {
  palette.set(m[1], oklchToSrgb(Number(m[2]) / 100, Number(m[3]), Number(m[4])))
  if (m[5] !== undefined) {
    alphas.set(m[1], Number(m[5]))
  }
}

const aliases = new Map()
for (const m of readFileSync("src/styles/tokens/semantic.css", "utf8").matchAll(ALIAS)) {
  aliases.set(m[1], m[2])
}

function resolveName(token) {
  let current = token
  for (let i = 0; i < 8 && aliases.has(current); i += 1) {
    current = aliases.get(current)
  }
  return current
}

function resolve(token, backdropToken) {
  const name = resolveName(token)
  const colour = palette.get(name)
  if (colour === undefined) {
    return undefined
  }
  const alpha = alphas.get(name)
  if (alpha === undefined) {
    return colour
  }
  const backdrop = backdropToken === undefined ? undefined : resolve(backdropToken)
  if (backdrop === undefined) {
    return colour
  }
  return composite(colour, alpha, backdrop)
}

const PAIRS = [
  ["text-primary", "surface-page"],
  ["text-primary", "surface-panel"],
  ["text-secondary", "surface-page"],
  ["text-secondary", "surface-panel"],
  ["text-muted", "surface-page"],
  ["text-muted", "surface-panel"],
  ["text-faint", "surface-page"],
  ["text-display", "surface-page"],
  ["state-accepted-ink", "state-accepted-surface"],
  ["state-asking-ink", "state-asking-surface"],
  ["state-escalated-ink", "state-escalated-surface"],
  ["state-lasa-ink", "state-lasa-surface"],
  ["state-pending-ink", "state-pending-surface"],
  ["action-ink", "surface-panel"],
  ["action-disabled-ink", "action-disabled-surface"],
  ["select-ink", "select-surface"],
  ["mic-idle-ink", "surface-panel"],
  ["mic-listening-ink", "surface-panel"],
  ["mic-speaking-ink", "surface-panel"],
  ["mic-blocked-ink", "surface-panel"],
  ["text-on-accent", "action-rest"],
]

let failed = 0
let unresolved = 0

for (const [foreground, background] of PAIRS) {
  const bg = resolve(background, "surface-page")
  const fg = resolve(foreground, background)
  if (fg === undefined || bg === undefined) {
    console.error(`unresolved token pair: ${foreground} on ${background}`)
    unresolved += 1
    continue
  }
  const ratio = contrast(fg, bg)
  if (ratio < BODY_MIN && !EXEMPT.has(foreground)) {
    console.error(`${foreground} on ${background}: ${ratio.toFixed(2)} is below ${BODY_MIN}`)
    failed += 1
  }
}

if (unresolved > 0) {
  console.error("")
  console.error(
    "a token pair that cannot be resolved is not a pass; fix the name or the pair list",
  )
  process.exit(1)
}

if (failed > 0) {
  console.error("")
  console.error("body text must reach 4.5:1; disabled controls are the only exemption")
  process.exit(1)
}

console.log(`contrast: ${PAIRS.length} token pairs checked, all readable`)
