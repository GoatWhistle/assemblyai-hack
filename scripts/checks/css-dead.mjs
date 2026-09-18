import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { dirname, relative } from "node:path"

const CLASS_SELECTOR = /\.([a-zA-Z][a-zA-Z0-9_-]*)/g
const DOT_ACCESS = /styles\.([a-zA-Z][a-zA-Z0-9_]*)/g
const BRACKET_ACCESS = /styles\[/

const BASELINE = "scripts/baselines/css-dead.txt"

function readBaseline() {
  try {
    return new Set(
      readFileSync(BASELINE, "utf8")
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#")),
    )
  } catch {
    return new Set()
  }
}

function classesIn(source) {
  const found = new Set()
  for (const match of source.matchAll(CLASS_SELECTOR)) {
    const name = match[1]
    if (name !== undefined) {
      found.add(name)
    }
  }
  return found
}

function usedIn(source) {
  const found = new Set()
  for (const match of source.matchAll(DOT_ACCESS)) {
    const name = match[1]
    if (name !== undefined) {
      found.add(name)
    }
  }
  return found
}

const sheets = []
for await (const entry of glob("src/**/styles.module.css")) {
  sheets.push(entry.replaceAll("\\", "/"))
}
for await (const entry of glob("app/**/styles.module.css")) {
  sheets.push(entry.replaceAll("\\", "/"))
}

if (sheets.length === 0) {
  console.error("no component stylesheets were found; the check cannot verify anything")
  process.exit(1)
}

const baseline = readBaseline()
const problems = []
const dynamic = []
let checked = 0

for (const sheet of sheets) {
  const folder = dirname(sheet)
  const ownerPath = folder.startsWith("app/") ? `${folder}/page.tsx` : `${folder}/index.tsx`
  let owner
  try {
    owner = readFileSync(ownerPath, "utf8")
  } catch {
    continue
  }

  checked += 1

  if (BRACKET_ACCESS.test(owner)) {
    dynamic.push(relative(process.cwd(), ownerPath).replaceAll("\\", "/"))
    continue
  }

  const declared = classesIn(readFileSync(sheet, "utf8"))
  const used = usedIn(owner)

  for (const name of declared) {
    if (used.has(name)) {
      continue
    }
    const key = `${sheet}:${name}`
    if (baseline.has(key)) {
      continue
    }
    problems.push(key)
  }
}

if (problems.length > 0) {
  for (const problem of problems.sort()) {
    console.error(problem)
  }
  console.error("")
  console.error(
    `${problems.length} class selectors are declared but never read by the component that owns the sheet`,
  )
  console.error(
    "a rule nothing references is the residue of an edit that moved markup and left the styles behind",
  )
  if (process.argv.includes("--update")) {
    mkdirSync("scripts/baselines", { recursive: true })
    writeFileSync(BASELINE, `${problems.sort().join("\n")}\n`, "utf8")
    console.error("")
    console.error(
      `recorded ${problems.length} entries in ${BASELINE}; the counter only moves down`,
    )
    process.exit(0)
  }
  console.error(`record what is already dead with: node ${import.meta.filename} --update`)
  process.exit(1)
}

console.log(
  `css-dead: every class in ${checked} component sheets is read by its owner${dynamic.length > 0 ? `, ${dynamic.length} skipped for dynamic access` : ""}`,
)
