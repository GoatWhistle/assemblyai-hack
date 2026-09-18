import { readFileSync } from "node:fs"
import { glob } from "node:fs/promises"

const CONFIDENCE_WORDS = /\b(confidence|certainty|minConfidence)\b/i
const SCORE_WORDS = /\b(score|accuracy|quality|rating|grade)\b/i
const PERCENT_MATH = /\*\s*100\b/

const GEOMETRY_ALLOWED = new Set(["src/shared/ui/data-display/certainty/index.tsx"])

const problems = []
const files = []

for await (const entry of glob("src/**/*.tsx")) {
  files.push(entry.replaceAll("\\", "/"))
}
for await (const entry of glob("app/**/*.tsx")) {
  files.push(entry.replaceAll("\\", "/"))
}

if (files.length === 0) {
  console.error("no components were found; the check cannot verify anything")
  process.exit(1)
}

for (const file of files) {
  const source = readFileSync(file, "utf8")
  const lines = source.split("\n")

  for (const [index, line] of lines.entries()) {
    const at = `${file}:${index + 1}`

    if (CONFIDENCE_WORDS.test(line) && SCORE_WORDS.test(line)) {
      problems.push(
        `${at} calls confidence a score: the product exists to say the number is not one`,
      )
    }

    if (!CONFIDENCE_WORDS.test(line) || !PERCENT_MATH.test(line)) {
      continue
    }
    if (GEOMETRY_ALLOWED.has(file)) {
      continue
    }
    problems.push(
      `${at} multiplies a confidence by 100; rendering it as a percentage makes it read as a quality score`,
    )
  }

  if (/aria-label[^\n]*\b(confidence|certainty)\b[^\n]*%/i.test(source)) {
    problems.push(
      `${file} states a confidence as a percentage in an accessible name; the ratio form keeps it a certainty rather than a grade`,
    )
  }
}

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(problem)
  }
  console.error("")
  console.error(
    "confidence is the recognizer's own certainty beside a validator verdict, never a percentage with a meter",
  )
  console.error(
    `geometry that positions a marker is exempt by name: ${[...GEOMETRY_ALLOWED].join(", ")}`,
  )
  process.exit(1)
}

console.log(
  `confidence language: ${files.length} components carry no confidence rendered as a score`,
)
