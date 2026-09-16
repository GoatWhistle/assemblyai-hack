import { describe, expect, it } from "vitest"
import { buildAgentDefinition, DEFAULT_LLM_MODEL, SYSTEM_PROMPT, TURN_DETECTION } from "@/agent"
import { lasaCheckedTerms, normalizeTerm } from "@/lasa"

const definition = buildAgentDefinition({
  baseUrl: "https://readback.example.com",
  toolSecret: "test-secret",
})

describe("agent definition", () => {
  it("declares the five tools with their http urls", () => {
    expect(definition.tools.map((t) => t.name)).toEqual([
      "lookup_drug",
      "validate_prescriber",
      "propose_field",
      "read_back",
      "commit_order",
    ])
    for (const tool of definition.tools) {
      expect(
        tool.http.url.startsWith("https://readback.example.com/api/tools/"),
        tool.name,
      ).toBe(true)
      expect(tool.http.method).toBe("POST")
    }
  })

  it("runs commit order in hold and everything else interactive", () => {
    for (const tool of definition.tools) {
      expect(tool.execution_mode, tool.name).toBe(
        tool.name === "commit_order" ? "hold" : "interactive",
      )
    }
  })

  it("puts the shared secret in a write only header, never in the url", () => {
    for (const tool of definition.tools) {
      expect(tool.http.headers["x-readback-tool-secret"]).toBe("test-secret")
      expect(tool.http.url).not.toContain("test-secret")
    }
  })

  it("picks a model that supports tool calling and streaming", () => {
    expect(definition.model).toBe(DEFAULT_LLM_MODEL)
    expect(definition.model).not.toBe("qwen3.5-4b-32k-fast")
    expect(definition.model).not.toBe("gpt-oss-120b")
  })

  it("keeps min silence strictly below max silence", () => {
    expect(TURN_DETECTION.min_silence).toBeLessThan(TURN_DETECTION.max_silence)
  })

  it("passes keyterms that contain no lasa checked drug name", () => {
    const forbidden = lasaCheckedTerms()
    const leaked = definition.input.keyterms.filter((t) => forbidden.has(normalizeTerm(t)))
    expect(leaked).toEqual([])
    expect(definition.input.keyterms.length).toBeLessThanOrEqual(100)
  })

  it("names no drug and no confidence threshold in the system prompt", () => {
    const prompt = SYSTEM_PROMPT.toLowerCase()
    for (const term of lasaCheckedTerms()) {
      expect(prompt, `the prompt leaks the lasa term ${term}`).not.toContain(term)
    }
    expect(prompt).not.toMatch(/0\.9\d/)
  })

  it("tells the model that propose_field never writes", () => {
    expect(SYSTEM_PROMPT).toContain("propose_field does not write")
    expect(SYSTEM_PROMPT).toContain("not a clinician")
  })

  it("uses pcm on both directions", () => {
    expect(definition.input.format.encoding).toBe("audio/pcm")
    expect(definition.output.format.encoding).toBe("audio/pcm")
  })

  it("never names the retired model or the two removed async parameters", () => {
    const serialized = JSON.stringify(definition)
    expect(serialized).not.toContain("universal-3-pro")
    expect(serialized).not.toContain("summarization")
    expect(serialized).not.toContain("auto_chapters")
  })

  it("declares every tool parameter schema as a closed object", () => {
    for (const tool of definition.tools) {
      expect(tool.parameters.type, tool.name).toBe("object")
      expect(tool.parameters.additionalProperties, tool.name).toBe(false)
    }
  })
})
