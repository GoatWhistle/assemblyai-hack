import { FIELD_NAMES } from "@/domain"

type ToolExecutionMode = "interactive" | "hold"

export type ToolHeader = {
  readonly name: string
  readonly value: string
}

export type AgentTool = {
  readonly type: "function"
  readonly name: string
  readonly description: string
  readonly parameters: Readonly<Record<string, unknown>>
  readonly execution_mode: ToolExecutionMode
  readonly timeout_seconds: number
  readonly http: {
    readonly url: string
    readonly http_method: "POST"
    readonly headers: readonly ToolHeader[]
  }
}

const FIELD_ENUM = [...FIELD_NAMES]

const TOOL_SESSION_PARAM = "sid"

function httpFor(
  baseUrl: string,
  path: string,
  secret: string,
  sessionId: string | undefined,
): AgentTool["http"] {
  const url = new URL(`/api/tools/${path}`, baseUrl)
  if (sessionId !== undefined) {
    url.searchParams.set(TOOL_SESSION_PARAM, sessionId)
  }
  return {
    url: url.toString(),
    http_method: "POST",
    headers: [{ name: "x-readback-tool-secret", value: secret }],
  }
}

export function buildTools(
  baseUrl: string,
  secret: string,
  sessionId?: string,
): readonly AgentTool[] {
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
      http: httpFor(baseUrl, "lookup-drug", secret, sessionId),
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
      http: httpFor(baseUrl, "validate-prescriber", secret, sessionId),
    },
    {
      type: "function",
      name: "propose_field",
      description:
        "Propose a value for one order field. Call it once for every value the caller says, in the same turn; when one caller turn holds several values, call it once per value. It returns a candidate_id and a say_to_caller sentence. If written_to_order is true, an arithmetic validator proved the value and it is already written: say the sentence and follow after_this.next. Otherwise register the sentence with read_back, say it, and write the value with the second read_back call once the caller answers. If it returns E_QUOTATION_NOT_YET_RECEIVED, the caller's words have not reached the server yet: call propose_field again with the arguments in retry_with, and do not ask the caller to repeat.",
      parameters: {
        type: "object",
        properties: {
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
              'Only the two to five words of the caller\'s speech that carry this value, copied exactly, for example "Maria Lopez" or "30 tablets". Used to locate the source words and their timings and confidence. Never write words the caller did not say.',
          },
        },
        required: ["field", "value", "transcript_hint"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 20,
      http: httpFor(baseUrl, "propose-field", secret, sessionId),
    },
    {
      type: "function",
      name: "read_back",
      description:
        "Register that you are about to read a value back to the caller and that their next utterance is the answer. Call this immediately before you speak the confirmation sentence, then speak it. The caller's yes or no is interpreted against this registration. For a value in a published sound-alike pair the sentence must name every drug of the pair, and only the caller saying one of the names confirms it; if your sentence does not, the result carries the sentence to say instead.",
      parameters: {
        type: "object",
        properties: {
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
              "Leave this out on the call that registers the read-back. Call read_back a SECOND time with the same candidate_id and the caller's reply copied verbatim once they have answered. This text is a hint kept for the record, not evidence: the server judges the answer from the recorded speech of your read-back and of the caller's next turn, so a value the caller never answered aloud can never be recorded.",
          },
        },
        required: ["field", "candidate_id", "utterance"],
        additionalProperties: false,
      },
      execution_mode: "interactive",
      timeout_seconds: 5,
      http: httpFor(baseUrl, "read-back", secret, sessionId),
    },
    {
      type: "function",
      name: "commit_order",
      description:
        "Place the order. Call this at once when the caller answers yes to your read-back of the whole order; saying you will place it does not place it. It refuses unless every critical field is written, by propose_field when a validator proved it or by a read_back call otherwise, and then names the fields to collect. When the caller asks to submit early, call it with caller_confirmed false so the refusal names what is missing. The server records your full read-back from the recorded speech of the call.",
      parameters: {
        type: "object",
        properties: {
          caller_confirmed: {
            type: "boolean",
            description:
              "True only if the caller answered yes to the full read-back. Never set this true on your own judgement.",
          },
        },
        required: ["caller_confirmed"],
        additionalProperties: false,
      },
      execution_mode: "hold",
      timeout_seconds: 30,
      http: httpFor(baseUrl, "commit-order", secret, sessionId),
    },
  ]
}
