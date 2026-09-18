import { readFileSync } from "node:fs"

const raw = readFileSync(0, "utf8")
const start = raw.indexOf("{")

if (start < 0) {
  console.log("no-report")
  process.exit(0)
}

let report
try {
  report = JSON.parse(raw.slice(start))
} catch {
  console.log("unparsed")
  process.exit(0)
}

const wanted = process.argv[2] ?? ""
let ran = 0
let failed = 0

for (const suite of report.testResults ?? []) {
  for (const testCase of suite.assertionResults ?? []) {
    const title = [...(testCase.ancestorTitles ?? []), testCase.title ?? ""].join(" ")
    if (!title.includes(wanted)) {
      continue
    }
    ran += 1
    if (testCase.status === "failed") {
      failed += 1
    }
  }
}

if (failed > 0) {
  console.log("failed")
} else if (ran > 0) {
  console.log("passed")
} else {
  console.log("absent")
}
