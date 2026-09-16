import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"

const DEFINITION = /--([a-z0-9-]+)\s*:/g
const REFERENCE = /var\(\s*(--[a-z0-9-]+)/g

const TOKEN_FILES = [
  "src/styles/tokens/palette.css",
  "src/styles/tokens/semantic.css",
  "src/styles/tokens/typography.css",
  "src/styles/tokens/motion.css",
]

const defined = new Set()
for (const file of TOKEN_FILES) {
  for (const m of readFileSync(file, "utf8").matchAll(DEFINITION)) {
    defined.add(`--${m[1]}`)
  }
}

const missing = []
for await (const file of glob("src/**/*.css")) {
  const source = readFileSync(file, "utf8")
  const local = new Set()
  for (const m of source.matchAll(DEFINITION)) {
    local.add(`--${m[1]}`)
  }
  for (const m of source.matchAll(REFERENCE)) {
    const name = m[1]
    if (!defined.has(name) && !local.has(name)) {
      const line = source.slice(0, m.index).split("\n").length
      missing.push(`${file}:${line} references ${name}, which no token file defines`)
    }
  }
}

if (defined.size === 0) {
  console.error("no tokens were found at all; the check cannot verify anything")
  process.exit(1)
}

if (missing.length > 0) {
  for (const line of missing) {
    console.error(line)
  }
  console.error("")
  console.error(
    "a var() pointing at a deleted token renders as nothing and is invisible in tests",
  )
  process.exit(1)
}

console.log(`token references: every var() resolves, ${defined.size} tokens defined`)
