#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

if [ ! -d src ]; then
  echo "no src directory at $ROOT, so no import graph was examined" >&2
  echo "absence must not read as success: a check that cannot see its subject fails" >&2
  exit 1
fi

node - <<'JS'
const fs = require("node:fs")
const path = require("node:path")

const TREES = ["src", "app", "tests", "scripts"]
const GATE = "gate"
const GATE_ALLOWED = new Set(["domain", "validators", "lasa", "catalog"])
const EXTENSIONS = [".ts", ".tsx", ".mjs", ".js"]
const ALIASES = [
  ["@app/", "app/"],
  ["@/", "src/"],
]
const SPECIFIER =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+|\brequire\s*\(\s*|\bvi\.mock\s*\(\s*)["']([^"'\n]+)["']/g

function walk(dir, out = []) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch {
    return out
  }
  for (const e of entries) {
    if (e.name === "node_modules" || e.name.startsWith(".")) continue
    const p = `${dir}/${e.name}`
    if (e.isDirectory()) walk(p, out)
    else if (/\.(ts|tsx|mjs|js)$/.test(e.name) && !e.name.endsWith(".d.ts")) out.push(p)
  }
  return out
}

const files = TREES.flatMap((tree) => walk(tree))
const known = new Set(files)

function resolveFile(base) {
  const candidates = [base, ...EXTENSIONS.map((ext) => base + ext)]
  for (const ext of EXTENSIONS) candidates.push(`${base}/index${ext}`)
  return candidates.find((candidate) => known.has(candidate)) ?? null
}

function resolveSpecifier(from, spec) {
  for (const [alias, target] of ALIASES) {
    if (spec.startsWith(alias)) return resolveFile(path.posix.normalize(target + spec.slice(alias.length)))
  }
  if (spec.startsWith("./") || spec.startsWith("../")) {
    return resolveFile(path.posix.normalize(path.posix.join(path.posix.dirname(from), spec)))
  }
  return null
}

function packageOf(file) {
  const parts = file.split("/")
  return parts[0] === "src" && parts.length > 2 ? parts[1] : null
}

const edges = new Map()
for (const file of files) {
  const text = fs.readFileSync(file, "utf8")
  const targets = new Set()
  for (const m of text.matchAll(SPECIFIER)) {
    const to = resolveSpecifier(file, m[1])
    if (to !== null && to !== file) targets.add(to)
  }
  edges.set(file, [...targets].sort())
}

let failed = false

for (const [from, targets] of edges) {
  if (packageOf(from) !== GATE) continue
  for (const to of targets) {
    const owner = packageOf(to)
    if (owner !== GATE && !GATE_ALLOWED.has(owner)) {
      console.error(`gate must stay a leaf; ${from} imports ${to}`)
      failed = true
    }
  }
}

function stronglyConnected(graph) {
  let counter = 0
  const index = new Map()
  const low = new Map()
  const onStack = new Set()
  const stack = []
  const found = []
  for (const root of [...graph.keys()].sort()) {
    if (index.has(root)) continue
    const work = [[root, 0]]
    index.set(root, counter)
    low.set(root, counter)
    counter += 1
    stack.push(root)
    onStack.add(root)
    while (work.length > 0) {
      const frame = work[work.length - 1]
      const [node, cursor] = frame
      const next = (graph.get(node) ?? [])[cursor]
      if (next !== undefined) {
        frame[1] = cursor + 1
        if (!index.has(next)) {
          index.set(next, counter)
          low.set(next, counter)
          counter += 1
          stack.push(next)
          onStack.add(next)
          work.push([next, 0])
        } else if (onStack.has(next)) {
          low.set(node, Math.min(low.get(node), index.get(next)))
        }
        continue
      }
      work.pop()
      if (work.length > 0) {
        const parent = work[work.length - 1][0]
        low.set(parent, Math.min(low.get(parent), low.get(node)))
      }
      if (low.get(node) === index.get(node)) {
        const component = []
        let member
        do {
          member = stack.pop()
          onStack.delete(member)
          component.push(member)
        } while (member !== node)
        if (component.length > 1) found.push(component.sort())
      }
    }
  }
  return found
}

for (const component of stronglyConnected(edges)) {
  console.error(`file import cycle: ${component.join(" <-> ")}`)
  failed = true
}

const packages = new Map()
for (const [from, targets] of edges) {
  const source = packageOf(from)
  if (source === null) continue
  for (const to of targets) {
    const target = packageOf(to)
    if (target === null || target === source) continue
    if (!packages.has(source)) packages.set(source, new Set())
    packages.get(source).add(target)
  }
}
const packageGraph = new Map([...packages].map(([key, value]) => [key, [...value].sort()]))
for (const component of stronglyConnected(packageGraph)) {
  console.error(`package import cycle: ${component.join(" <-> ")}`)
  failed = true
}

const edgeCount = [...edges.values()].reduce((sum, targets) => sum + targets.length, 0)
if (files.length === 0 || edgeCount === 0) {
  console.error("no import was resolved at all, so a pass would prove nothing")
  process.exit(1)
}

if (failed) {
  console.error("")
  console.error("cycles are forbidden, test imports included")
  process.exit(1)
}

console.log(
  `import cycles: none over ${files.length} files and ${edgeCount} resolved imports in ${TREES.join(", ")}; gate is a leaf`,
)
JS
