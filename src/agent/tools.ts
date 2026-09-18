import { FIELD_NAMES } from "@/domain"

type ToolExecutionMode = "interactive" | "hold"

export type AgentTool = {
  readonly type: "function"
  readonly name: string
  readonly description: string
  readonly parameters: Readonly<Record<string, unknown>>
  readonly execution_mode: ToolExecutionMode
  readonly timeout_seconds: number
  readonly http: {
    readonly url: string
    readonly method: "POST"
    readonly headers: Readonly<Record<string, string>>
  }
}

const FIELD_ENUM = [...FIELD_NAMES]

function httpFor(baseUrl: string, path: string, secret: string): AgentTool["http"] {
  return {
    url: new URL(`/api/tools/${path}`, baseUrl).toString(),
    method: "POST",
    headers: { "x-readback-tool-secret": secret },
  }
}

export function buildTools(baseUrl: string, secret: string): readonly AgentTool[] {
  return [
    {
      type: "function",
      name: "lookup_drug",
      description:
        "Search the FDA NDC directory for a drug by spoken name. Returns candidate drugs with the strength, dosage form and route combinations that actually exist. Call this BEFORE proposing drug_name, strength, dosage_form or route. Never invent a combination that this tool did not return.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description:
              "The drug name exactly as you heard it, with no correction or normalization applied.",
          },
          limit: {
            type: "integer",
            description: "Maximum number of candidate drugs to return.",
            minimum: 1,
            maximum: 5,
            default: 3,
          },
        },
        required: ["query"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 10,
      http: httpFor(baseUrl, "lookup-drug", secret),
    },
    {
      type: "function",
      name: "validate_prescriber",
      description:
        "Run the arithmetic checksum on a prescriber NPI and, if the drug is a controlled substance, on the DEA number. These are hard mathematical checks, not lookups. Call this as soon as you have the digits, before propose_field.",
      parameters: {
        type: "object",
        properties: {
          npi: {
            type: "string",
            description: "Ten digits, no separators, exactly as heard.",
            pattern: "^[0-9]{10}$",
          },
          dea: {
            type: "string",
            description:
              "Two letters followed by seven digits, e.g. AB1234563. Required only for controlled substances.",
            pattern: "^[A-Za-z]{2}[0-9]{7}$",
          },
        },
        required: ["npi"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 5,
      http: httpFor(baseUrl, "validate-prescriber", secret),
    },
    {
      type: "function",
      name: "propose_field",
      description:
        'Propose a value for one order field. This NEVER writes to the order. It returns a gate decision that tells you whether the value was accepted or what exactly to ask the caller. You must call this for every field. If the decision action is not "accept", you must follow the returned instruction before proposing that field again.',
      parameters: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description:
              "The session id you were given at the start of this call. Every call in one conversation uses the same value.",
          },
          field: {
            type: "string",
            enum: FIELD_ENUM,
            description: "Which order field this value is for.",
          },
          value: {
            type: "string",
            description:
              "The value exactly as the caller said it. Do not correct spelling, do not expand abbreviations, do not convert numbers. The backend normalizes.",
          },
          transcript_hint: {
            type: "string",
            description:
              "The contiguous stretch of the caller's last utterance that this value came from, copied verbatim. Used to locate the source words and their timings and confidence. If you cannot copy it verbatim, say so to the caller instead of guessing.",
          },
        },
        required: ["session_id", "field", "value", "transcript_hint"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 15,
      http: httpFor(baseUrl, "propose-field", secret),
    },
    {
      type: "function",
      name: "read_back",
      description:
        "Register that you are about to read a value back to the caller and that their next utterance is the answer. Call this immediately before you speak the confirmation sentence, then speak it. The caller's yes or no is interpreted against this registration.",
      parameters: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description:
              "The session id you were given at the start of this call. Every call in one conversation uses the same value.",
          },
          field: { type: "string", enum: FIELD_ENUM },
          candidate_id: {
            type: "string",
            description:
              "The candidate_id returned by propose_field for the value you are reading back.",
          },
          utterance: {
            type: "string",
            description:
              "The exact sentence you are about to say, word for word. This is stored as the audit record of what the caller confirmed.",
          },
          style: {
            type: "string",
            enum: ["plain", "spell_out"],
            description:
              "plain for a normal read-back, spell_out when the gate asked for character-by-character.",
            default: "plain",
          },
          caller_answer: {
            type: "string",
            description:
              "Leave this out on the call that registers the read-back. Call read_back a SECOND time with the same candidate_id and the caller's reply copied verbatim once they have answered. That second call is the only path by which a value is ever written to the order, so a value the caller never answered aloud can never be recorded.",
          },
        },
        required: ["session_id", "field", "candidate_id", "utterance"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 5,
      http: httpFor(baseUrl, "read-back", secret),
    },
    {
      type: "function",
      name: "commit_order",
      description:
        "Write the order. This refuses unless every critical field is a confirmed value. Before calling it you must read the whole order back to the caller and get an explicit yes. If it refuses, it tells you which fields are missing - collect those, do not call it again with the same state.",
      parameters: {
        type: "object",
        properties: {
          session_id: {
            type: "string",
            description:
              "The session id you were given at the start of this call. Every call in one conversation uses the same value.",
          },
          full_order_read_back: {
            type: "string",
            description:
              "The exact sentence in which you read the complete order back to the caller, word for word.",
          },
          caller_confirmed: {
            type: "boolean",
            description:
              "True only if the caller answered yes to the full read-back. Never set this true on your own judgement.",
          },
        },
        required: ["session_id", "full_order_read_back", "caller_confirmed"],
        additionalProperties: false,
      },
      execution_mode: "hold",
      timeout_seconds: 30,
      http: httpFor(baseUrl, "commit-order", secret),
    },
  ]
}
