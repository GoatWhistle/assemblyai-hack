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

const GATE = "gate"
const GATE_ALLOWED = new Set(["domain", "validators", "lasa", "catalog"])
const edges = new Map()

function walk(dir, out = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, out)
    else if (/\.tsx?$/.test(e.name)) out.push(p)
  }
  return out
}

function owner(spec) {
  const m = spec.match(/^(?:@\/|\.\.\/)*([a-z0-9-]+)/i)
  return m ? m[1] : null
}

const files = [...walk("src"), ...(fs.existsSync("tests") ? walk("tests") : [])]

for (const file of files) {
  const from = file.startsWith("src" + path.sep)
    ? file.split(path.sep)[1]
    : null
  if (!from) continue
  const text = fs.readFileSync(file, "utf8")
  for (const m of text.matchAll(/(?:from|import)\s+["'](@\/[^"']+)["']/g)) {
    const to = owner(m[1].slice(2))
    if (!to || to === from) continue
    if (!edges.has(from)) edges.set(from, new Set())
    edges.get(from).add(to)
  }
}

let failed = false

const gateDeps = edges.get(GATE) ?? new Set()
const illegal = [...gateDeps].filter((d) => !GATE_ALLOWED.has(d))
if (illegal.length > 0) {
  console.error(`gate must stay a leaf; it imports ${illegal.sort().join(", ")}`)
  failed = true
}

const state = new Map()
const stack = []

function visit(node) {
  state.set(node, "grey")
  stack.push(node)
  for (const next of [...(edges.get(node) ?? [])].sort()) {
    if (state.get(next) === "grey") {
      const cycle = stack.slice(stack.indexOf(next)).concat(next)
      console.error(`import cycle: ${cycle.join(" -> ")}`)
      failed = true
    } else if (!state.has(next)) {
      visit(next)
    }
  }
  stack.pop()
  state.set(node, "black")
}

for (const node of [...edges.keys()].sort()) {
  if (!state.has(node)) visit(node)
}

if (failed) {
  console.error("")
  console.error("cycles are forbidden, test imports included")
  process.exit(1)
}

console.log("import cycles: none, gate is a leaf")
JS
