import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

const TREES = ["src", "app"]
const TOUCH_TOKEN = "--target-touch"
const INTERACTIVE = /cursor:\s*pointer|^\s*\.[A-Za-z][\w-]*:(hover|focus-visible)/m

const REM_PX = 16
const FLOOR_PX = 44
const HEIGHT_DECLARATION = /(?:^|[;{\s])(?:min-)?height:\s*([^;}]+)/g
const COARSE_BLOCK = /@media[^{]*\(\s*pointer\s*:\s*coarse\s*\)\s*\{/g
const HIT_AREA = /::(?:after|before)[^{]*\{[^}]*min-(?:width|height):\s*var\(--target-touch\)/s

function clearsFloorOutright(source) {
  for (const match of source.matchAll(HEIGHT_DECLARATION)) {
    const pixels = pixelsOf(match[1])
    if (pixels !== null && pixels >= FLOOR_PX) {
      return true
    }
  }
  return false
}

const INLINE_EXEMPT = new Map([
  [
    "src/features/transcript-view/transcript-line/styles.module.css",
    "each word of the transcript is its own control so a click reveals that word's provenance; a 44px floor here would break the transcript into a grid of buttons and destroy the reading it exists to support",
  ],
  [
    "src/shared/ui/data-display/word-span-strip/styles.module.css",
    "the same reason as the transcript line: one control per spoken word, laid out as running text rather than as a control surface",
  ],
])

function pixelsOf(value) {
  const trimmed = value.trim()
  if (trimmed.includes(TOUCH_TOKEN)) {
    return FLOOR_PX
  }
  const match = /^([\d.]+)(rem|px)$/.exec(trimmed)
  if (match === null) {
    return null
  }
  return match[2] === "rem" ? Number(match[1]) * REM_PX : Number(match[1])
}

function blockAt(source, openIndex) {
  let depth = 0
  for (let index = openIndex; index < source.length; index += 1) {
    if (source[index] === "{") {
      depth += 1
    } else if (source[index] === "}") {
      depth -= 1
      if (depth === 0) {
        return source.slice(openIndex, index + 1)
      }
    }
  }
  return source.slice(openIndex)
}

function coarseSource(source) {
  let combined = ""
  for (const match of source.matchAll(COARSE_BLOCK)) {
    combined += blockAt(source, match.index + match[0].length - 1)
  }
  return combined
}

function shortDeclarations(source) {
  const short = []
  for (const match of source.matchAll(HEIGHT_DECLARATION)) {
    const pixels = pixelsOf(match[1])
    if (pixels !== null && pixels < FLOOR_PX) {
      short.push(`${match[1].trim()} (${pixels}px)`)
    }
  }
  return short
}

const INTERACTIVE_STATE = /(\.[A-Za-z][\w-]*):(?:hover|focus-visible|active)/g
const RULE_HEAD = /^[ \t]*([^@{}\r\n][^{}\r\n]*)\{/gm

function rulesFor(source) {
  const rules = new Map()
  for (const match of source.matchAll(RULE_HEAD)) {
    const head = match[1].trim()
    const open = source.indexOf("{", match.index)
    if (open === -1) {
      continue
    }
    rules.set(head, (rules.get(head) ?? "") + blockAt(source, open))
  }
  return rules
}

function interactiveClasses(source) {
  const named = new Set()
  for (const match of source.matchAll(INTERACTIVE_STATE)) {
    named.add(match[1])
  }
  return named
}

function classesMissingAFloor(source, coarse) {
  const rules = rulesFor(source)
  const bare = new Map()
  for (const [head, body] of rules) {
    const plain = head.split(",").map((part) => part.trim())
    for (const selector of plain) {
      if (/^\.[A-Za-z][\w-]*$/.test(selector)) {
        bare.set(selector, (bare.get(selector) ?? "") + body)
      }
    }
  }
  const standalone = [...interactiveClasses(source)].filter((name) =>
    /(?:^|[;{\s])display:/.test(bare.get(name) ?? ""),
  )
  return standalone.filter((name) => {
    const body = (bare.get(name) ?? "") + coarse
    return ![...body.matchAll(HEIGHT_DECLARATION)].some((match) => {
      const pixels = pixelsOf(match[1])
      return pixels !== null && pixels >= FLOOR_PX
    })
  })
}

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
    } else if (entry.name.endsWith(".module.css")) {
      out.push(full)
    }
  }
  return out
}

if (!existsSync("src")) {
  console.error("touch targets: src is missing, so the check cannot verify anything")
  process.exit(1)
}

const sheets = TREES.flatMap((tree) => walk(tree))

if (sheets.length === 0) {
  console.error("touch targets: no component sheets were found, which cannot be right")
  process.exit(1)
}

const offenders = []
let checked = 0
let exempt = 0
let lifted = 0

for (const sheet of sheets) {
  const source = readFileSync(sheet, "utf8")
  if (!INTERACTIVE.test(source)) {
    continue
  }
  if (INLINE_EXEMPT.has(sheet)) {
    exempt += 1
    continue
  }
  checked += 1

  const coarse = coarseSource(source)
  const outsideCoarse = coarse.length === 0 ? source : source.split(coarse).join("\n")
  const short = shortDeclarations(outsideCoarse)

  if (short.length > 0 && HIT_AREA.test(source)) {
    lifted += 1
    continue
  }

  const unfloored = classesMissingAFloor(source, coarse)
  if (unfloored.length > 0 && !HIT_AREA.test(source)) {
    offenders.push({
      sheet,
      why: `${unfloored.join(", ")} carries a hover or focus state but no height reaching ${FLOOR_PX}px; a sheet passes today if any one declaration reaches the floor, which is how a 28px brand link passed`,
    })
    continue
  }

  if (short.length === 0) {
    if (!source.includes(TOUCH_TOKEN) && !clearsFloorOutright(source)) {
      offenders.push({
        sheet,
        why: `no height declaration reaches ${TOUCH_TOKEN} or the ${FLOOR_PX}px floor outright`,
      })
    }
    continue
  }

  if (coarse.length === 0) {
    offenders.push({
      sheet,
      why: `${short.join(", ")} below the ${FLOOR_PX}px floor with no (pointer: coarse) block to lift it`,
    })
    continue
  }

  if (shortDeclarations(coarse).length > 0 || !coarse.includes(TOUCH_TOKEN)) {
    offenders.push({
      sheet,
      why: `${short.join(", ")} below the floor and the (pointer: coarse) block does not lift every variant to ${TOUCH_TOKEN}`,
    })
    continue
  }
  lifted += 1
}

if (checked === 0) {
  console.error(
    "touch targets: no interactive sheet was examined, so a pass would prove nothing",
  )
  process.exit(1)
}

for (const [sheet, reason] of INLINE_EXEMPT) {
  if (!existsSync(sheet)) {
    console.error(`touch targets: exemption names ${sheet}, which no longer exists`)
    console.error(`the recorded reason was: ${reason}`)
    process.exit(1)
  }
  if (!INTERACTIVE.test(readFileSync(sheet, "utf8"))) {
    console.error(`touch targets: ${sheet} is exempt but holds no interactive control`)
    console.error("an exemption that guards nothing will one day cover a real violation")
    process.exit(1)
  }
}

if (offenders.length > 0) {
  for (const offender of offenders) {
    console.error(`${offender.sheet}: ${offender.why}`)
  }
  console.error("")
  console.error(
    `every height a finger has to hit reaches ${TOUCH_TOKEN}, either outright or lifted inside (pointer: coarse); a sheet merely mentioning the token elsewhere is how a 28px link passed this check once`,
  )
  process.exit(1)
}

console.log(
  `touch targets: ${checked} interactive sheets clear ${FLOOR_PX}px, ${lifted} of them lifted for a coarse pointer, ${exempt} exempt with a recorded reason`,
)
