import { beforeEach, describe, expect, it } from "vitest"
import { buildAgentDefinition } from "@/agent"
import { FieldName } from "@/domain"
import { POST as commitOrder } from "../../app/api/tools/commit-order/route"
import { POST as lookupDrug } from "../../app/api/tools/lookup-drug/route"
import { POST as proposeField } from "../../app/api/tools/propose-field/route"
import { POST as readBack } from "../../app/api/tools/read-back/route"
import { POST as validatePrescriber } from "../../app/api/tools/validate-prescriber/route"
import { call, resetToolEnvironment, SESSION, seedTurn } from "../api/harness"

const definition = buildAgentDefinition({
  baseUrl: "https://readback.example.com",
  toolSecret: "test-tool-secret",
})

type Schema = {
  readonly properties: Readonly<Record<string, { readonly type?: string }>>
  readonly required?: readonly string[]
  readonly additionalProperties?: boolean
}

function schemaOf(name: string): Schema {
  const tool = definition.tools.find((entry) => entry.name === name)
  if (tool === undefined) {
    throw new Error(`no tool named ${name} in the definition`)
  }
  return tool.parameters as unknown as Schema
}

const SAMPLES: Readonly<Record<string, unknown>> = Object.freeze({
  session_id: SESSION,
  field: FieldName.DrugName,
  value: "lisinopril",
  transcript_hint: "lisinopril",
  candidate_id: "will-be-replaced",
  utterance: "Confirming the drug name: lisinopril. Correct?",
  style: "plain",
  caller_answer: "yes",
  full_order_read_back: "The whole order, read back.",
  caller_confirmed: true,
  query: "lisinopril",
  limit: 3,
  npi: "1234567893",
  dea: "AB1234563",
  drug_name: "lisinopril",
})

function bodyFromSchema(name: string, overrides: Readonly<Record<string, unknown>> = {}) {
  const schema = schemaOf(name)
  const body: Record<string, unknown> = {}
  for (const key of schema.required ?? []) {
    const sample = SAMPLES[key]
    if (sample === undefined) {
      throw new Error(`the contract test has no sample value for the required field ${key}`)
    }
    body[key] = sample
  }
  return { ...body, ...overrides }
}

const ROUTES: Readonly<Record<string, (request: Request) => Promise<Response>>> = Object.freeze(
  {
    lookup_drug: lookupDrug,
    validate_prescriber: validatePrescriber,
    propose_field: proposeField,
    read_back: readBack,
    commit_order: commitOrder,
  },
)

const PATHS: Readonly<Record<string, string>> = Object.freeze({
  lookup_drug: "lookup-drug",
  validate_prescriber: "validate-prescriber",
  propose_field: "propose-field",
  read_back: "read-back",
  commit_order: "commit-order",
})

describe("every tool the agent is given can actually be called", () => {
  beforeEach(() => {
    resetToolEnvironment()
    seedTurn("lisinopril ten milligrams", 0.99)
  })

  it("sends a body built only from the tool's own schema and is never rejected for a missing argument", async () => {
    for (const name of Object.keys(ROUTES)) {
      const handler = ROUTES[name]
      const path = PATHS[name]
      if (handler === undefined || path === undefined) {
        throw new Error(`the contract test is missing a route for ${name}`)
      }
      const response = await handler(call(path, bodyFromSchema(name)))
      const body = await response.json()
      expect(
        response.status,
        `${name} rejected a body containing exactly its declared required arguments: ${JSON.stringify(body)}`,
      ).not.toBe(400)
    }
  })

  it("declares session_id on every tool whose route requires it", async () => {
    for (const name of ["propose_field", "read_back", "commit_order"]) {
      const schema = schemaOf(name)
      expect(
        Object.keys(schema.properties),
        `${name} closes its schema with additionalProperties false, so an argument its route requires but its schema omits can never be sent`,
      ).toContain("session_id")
      expect(schema.required ?? []).toContain("session_id")
    }
  })

  it("gives read_back the argument that is the only path to a confirmed value", () => {
    const schema = schemaOf("read_back")
    expect(
      Object.keys(schema.properties),
      "caller_answer is the sole route to confirm(); without it in the schema no value can ever enter an order, so the hold refusal would fire for the wrong reason",
    ).toContain("caller_answer")
    expect(
      schema.required ?? [],
      "caller_answer must stay optional, because the first read_back call registers the question before any answer exists",
    ).not.toContain("caller_answer")
  })

  it("keeps every schema closed, which is what makes the omission fatal rather than tolerated", () => {
    for (const tool of definition.tools) {
      const schema = tool.parameters as unknown as Schema
      expect(schema.additionalProperties, tool.name).toBe(false)
    }
  })

  it("carries a value through to a confirmed field using only declared arguments", async () => {
    const proposed = await proposeField(call("propose-field", bodyFromSchema("propose_field")))
    const proposedBody = await proposed.json()
    expect(proposedBody.candidate_id).not.toBeNull()

    const registered = await readBack(
      call(
        "read-back",
        bodyFromSchema("read_back", {
          candidate_id: proposedBody.candidate_id,
          caller_answer: undefined,
        }),
      ),
    )
    expect(registered.status).toBe(200)

    const answered = await readBack(
      call("read-back", {
        ...bodyFromSchema("read_back", { candidate_id: proposedBody.candidate_id }),
        caller_answer: "yes",
      }),
    )
    const answeredBody = await answered.json()
    expect(
      answeredBody.written_to_order,
      "a spoken yes against a registered read-back is the one path into the order, and this is the assertion that it exists end to end",
    ).toBe(true)
  })
})
