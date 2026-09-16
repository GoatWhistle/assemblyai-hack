import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"
import { basename, dirname, relative, resolve } from "node:path"

const TOKENS_DIR = "src/styles/tokens"
const GLOBAL_SHEET = "src/styles/global.css"

const problems = []
const sheets = []

for await (const entry of glob("src/**/*.css")) {
  sheets.push(entry.replaceAll("\\", "/"))
}

if (sheets.length === 0) {
  console.error("no stylesheets were found at all; the check cannot verify anything")
  process.exit(1)
}

const modules = sheets.filter((file) => file.endsWith(".module.css"))

for (const sheet of modules) {
  const name = basename(sheet)
  const folder = dirname(sheet)

  if (name !== "styles.module.css") {
    problems.push(
      `${sheet} is not named styles.module.css; a component owns its folder, so its sheet has one name`,
    )
    continue
  }

  let hasIndex = false
  for await (const candidate of glob(`${folder}/index.tsx`)) {
    if (candidate) {
      hasIndex = true
    }
  }
  if (!hasIndex) {
    problems.push(`${sheet} has no index.tsx beside it, so nothing in that folder owns it`)
  }
}

const importers = new Map()
for await (const entry of glob("src/**/*.tsx")) {
  const file = entry.replaceAll("\\", "/")
  const source = readFileSync(file, "utf8")
  for (const m of source.matchAll(/from\s+"([^"]*\.module\.css)"/g)) {
    const target = m[1] ?? ""
    const key = resolve(dirname(file), target).replaceAll("\\", "/")
    const list = importers.get(key) ?? []
    list.push(file)
    importers.set(key, list)
  }
}

for (const [sheet, files] of importers) {
  if (new Set(files.map((f) => dirname(f))).size > 1) {
    problems.push(
      `${relative(process.cwd(), sheet).replaceAll("\\", "/")} is imported by ${files.length} components (${files.join(", ")}); a shared sheet means no component can be deleted cleanly`,
    )
  }
}

for (const sheet of sheets) {
  if (sheet.startsWith(TOKENS_DIR) || sheet === GLOBAL_SHEET) {
    continue
  }
  if (!sheet.endsWith(".module.css")) {
    problems.push(`${sheet} is a plain stylesheet; component styles are CSS modules`)
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem)
  }
  console.error("")
  console.error(
    "a component with its own styles lives in its own folder: index.tsx + styles.module.css",
  )
  process.exit(1)
}

console.log(`colocation: ${modules.length} components each own their folder and sheet`)
