import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const TOKEN_DIR = "src/styles/tokens"
const REQUIRED = ["palette", "semantic", "typography", "motion"]
const TREES = ["src", "app"]
const EXTENSIONS = /\.(css|ts|tsx)$/
const LITERAL_COLOUR = /#[0-9a-fA-F]{3,8}|oklch\(|rgba?\(|hsla?\(/
const COLOUR_PROPERTY =
  /(color|background|background-color|border-color|fill|stroke|outline-color|box-shadow|text-decoration-color)\s*:[^;]*(^|[\s:(,])(white|black|red|green|blue|gray|grey|silver|yellow|orange|purple|pink|brown|cyan|magenta|lime|navy|teal|olive|maroon|aqua|fuchsia)([\s,;)]|$)/

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name).split("\\").join("/")
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        continue
      }
      walk(full, out)
    } else if (EXTENSIONS.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

if (!existsSync("src")) {
  console.error("no src directory, so no stylesheet was examined for raw colour")
  console.error("absence must not read as success: a check that cannot see its subject fails")
  process.exit(1)
}

for (const required of REQUIRED) {
  const path = `${TOKEN_DIR}/${required}.css`
  if (!existsSync(path)) {
    console.error(`tokens: ${path} is missing; the check cannot verify anything`)
    process.exit(1)
  }
}

const offenders = []
let scanned = 0

for (const tree of TREES) {
  for (const file of walk(tree)) {
    if (file.startsWith(`${TOKEN_DIR}/`)) {
      continue
    }
    scanned += 1
    const lines = readFileSync(file, "utf8").split("\n")
    for (const [index, line] of lines.entries()) {
      if (LITERAL_COLOUR.test(line)) {
        offenders.push(`${file}:${index + 1}: ${line.trim()}`)
      } else if (file.endsWith(".css") && COLOUR_PROPERTY.test(line)) {
        offenders.push(`${file}:${index + 1}: ${line.trim()}`)
      }
    }
  }
}

if (offenders.length > 0) {
  for (const offender of offenders) {
    console.error(offender)
  }
  console.error("")
  console.error(`a literal colour is only allowed in ${TOKEN_DIR}/; use a token`)
  process.exit(1)
}

console.log(`tokens: ${scanned} files carry no literal colour outside the token files`)
