import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { buildAgentDefinition } from "@/agent"
import { lasaCheckedTerms } from "@/lasa"

const BIAS_PARAMETERS = ["transcription_prompt", "prompt", "word_boost", "custom_spelling"]

const COMPOSITION_VERBS = [
  "in your own words",
  "describe",
  "explain",
  "summarise",
  "summarize",
  "paraphrase",
  "your understanding",
]

const definition = buildAgentDefinition({
  baseUrl: "https://readback.example.com",
  toolSecret: "test-tool-secret",
})

type Schema = {
  readonly properties: Readonly<Record<string, { readonly description?: string }>>
}

function sourceFiles(dir: string, out: string[] = []): readonly string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    let directory: boolean
    try {
      directory = statSync(full).isDirectory()
    } catch {
      continue
    }
    if (directory) {
      sourceFiles(full, out)
    } else if (/\.tsx?$/.test(entry)) {
      out.push(full)
    }
  }
  return out
}

function readIfPresent(file: string): string | null {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return null
  }
}

describe("every channel that can bias the recognizer is closed, not just the one we knew about", () => {
  it("does not send any recogniser-biasing parameter other than the audited keyterms list", () => {
    const offenders: string[] = []
    const scanned = [...sourceFiles("src"), ...sourceFiles("app")]
    expect(
      scanned.length,
      "a walker that silently scanned nothing would pass this test while checking no file at all",
    ).toBeGreaterThan(50)
    for (const file of scanned) {
      const source = readIfPresent(file)
      if (source === null) {
        continue
      }
      for (const parameter of BIAS_PARAMETERS) {
        if (new RegExp(`\\b${parameter}\\s*[:=]`).test(source)) {
          offenders.push(`${file} sets ${parameter}`)
        }
      }
    }
    expect(
      offenders,
      "keyterms_prompt is audited for LASA terms by tests/lasa/keyterms-purity.test.ts. A second biasing channel would route around that audit entirely: the recogniser would be steered toward the exact strings the rules check, and the observation would stop being independent of the verification. If one of these is ever genuinely needed, extend the purity audit to cover it in the same change.",
    ).toEqual([])
  })

  it("keeps no LASA term anywhere in the agent definition, not only in keyterms", () => {
    const serialised = JSON.stringify(definition).toLowerCase()
    const leaked = [...lasaCheckedTerms()].filter((term) => {
      const needle = term.trim().toLowerCase()
      return needle.length > 4 && serialised.includes(needle)
    })
    expect(
      leaked,
      "a drug name under LASA check reaching the agent definition biases the model even when it never reaches keyterms",
    ).toEqual([])
  })
})

describe("no tool argument asks the model to compose anything", () => {
  it("asks only for copied or enumerated values", () => {
    const offenders: string[] = []
    for (const tool of definition.tools) {
      const schema = tool.parameters as unknown as Schema
      for (const [name, property] of Object.entries(schema.properties)) {
        const description = (property.description ?? "").toLowerCase()
        for (const verb of COMPOSITION_VERBS) {
          if (description.includes(verb)) {
            offenders.push(`${tool.name}.${name} asks the model to ${verb}`)
          }
        }
      }
    }
    expect(
      offenders,
      "a property requiring the model to compose prose has been measured elsewhere to suppress the tool call silently, with no session.error and no log. If that happened to commit_order, the refusal that is this product's demo would simply never fire.",
    ).toEqual([])
  })

  it("says copied or exact wherever it takes a sentence from the conversation", () => {
    const sentenceArguments = ["utterance", "full_order_read_back", "transcript_hint"]
    for (const tool of definition.tools) {
      const schema = tool.parameters as unknown as Schema
      for (const name of sentenceArguments) {
        const property = schema.properties[name]
        if (property === undefined) {
          continue
        }
        const description = (property.description ?? "").toLowerCase()
        expect(
          /verbatim|word for word|exact/.test(description),
          `${tool.name}.${name} takes a sentence without telling the model to copy it, which invites composition`,
        ).toBe(true)
      }
    }
  })
})
