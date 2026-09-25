import { writeFileSync } from "node:fs"
import { resolve } from "node:path"
import { SLIDES } from "@/features/deck/slides"

const HEADER = [
  "# Readback: slide contents",
  "",
  "Generated from `src/features/deck/slides.ts` by `make deck-markdown`; edit the deck, not",
  "this file. The printable deck is the `/deck` page, and the PDF is printed from it. Every",
  "figure carries its source; figures without a source do not reach the PDF.",
  "",
  "---",
  "",
]

export function deckMarkdown(): string {
  const sections = SLIDES.map((slide, index) => {
    const lines = [`## ${index + 1}. ${slide.title}`, "", ...slide.body.flatMap((p) => [p, ""])]
    if (slide.source !== undefined) {
      lines.push(`Source: ${slide.source}`, "")
    }
    return lines.join("\n")
  })
  return `${HEADER.join("\n")}\n${sections.join("\n---\n\n")}`
}

if (process.argv[1]?.includes("deck-markdown")) {
  const target = resolve("docs/slides.md")
  writeFileSync(target, deckMarkdown(), "utf8")
  console.log(`written ${target} from ${SLIDES.length} slides`)
}
