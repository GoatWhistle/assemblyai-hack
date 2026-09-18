import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const SERVER_ONLY = ["catalog", "sessions", "tools", "agent"]

const CLIENT_TREES = ["src/features", "src/realtime", "src/audio", "src/shared", "app/(pages)"]

function walk(dir, out = []) {
  let entries
  try {
    entries = readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const entry of entries) {
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full, out)
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full)
    }
  }
  return out
}

function importsOf(source) {
  const found = []
  const pattern = /import\s+(type\s+)?([^"';]*?)\s*from\s*["']([^"']+)["']/g
  for (const match of source.matchAll(pattern)) {
    found.push({
      typeOnly: match[1] !== undefined,
      clause: match[2] ?? "",
      specifier: match[3],
    })
  }
  return found
}

function moduleOf(specifier) {
  const alias = /^@\/([a-z-]+)/.exec(specifier)
  return alias === null ? null : alias[1]
}

function everyBindingIsAType(clause) {
  const braced = /\{([^}]*)\}/.exec(clause)
  if (braced === null) {
    return false
  }
  if (clause.slice(0, braced.index).replace(/,/g, "").trim().length > 0) {
    return false
  }
  const names = (braced[1] ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name.length > 0)
  return names.length > 0 && names.every((name) => name.startsWith("type "))
}

if (!existsSync("src")) {
  console.error("no src directory, so no client file was examined")
  console.error("absence must not read as success: a check that cannot see its subject fails")
  process.exit(1)
}

const offences = []
let scanned = 0

for (const tree of CLIENT_TREES) {
  for (const file of walk(tree)) {
    scanned += 1
    const source = readFileSync(file, "utf8")
    for (const entry of importsOf(source)) {
      const module = moduleOf(entry.specifier)
      if (module === null || !SERVER_ONLY.includes(module)) {
        continue
      }
      if (entry.typeOnly || everyBindingIsAType(entry.clause)) {
        continue
      }
      offences.push(`${file} imports a value from @/${module}`)
    }
  }
}

if (offences.length > 0) {
  console.error("server-only packages reached client code:")
  for (const offence of offences) {
    console.error(`  ${offence}`)
  }
  console.error("")
  console.error("data/catalog.json is 1.3 MB and session state lives on the server. A value")
  console.error("import from these packages pulls them toward the browser bundle, where the")
  console.error("catalogue would multiply first-load JS. Import types only, or put the work")
  console.error("behind an API route.")
  process.exit(1)
}

console.log(`server-only: ${scanned} client files import no server-only values`)
