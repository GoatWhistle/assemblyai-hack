import { z } from "zod"
import { isUsableSessionId } from "@/domain"

const MAX_IDENTIFIER_CHARS = 128
export const MAX_VALUE_CHARS = 256
export const MAX_UTTERANCE_CHARS = 1024

const CONTROL_RANGES = "\\u0000-\\u0008\\u000b\\u000c\\u000e-\\u001f\\u007f-\\u009f"

const CONTROL_CHARACTERS = new RegExp(`[${CONTROL_RANGES}]`, "g")

export function stripControlCharacters(value: string): string {
  return value.replace(CONTROL_CHARACTERS, " ").replace(/\s+/g, " ").trim()
}

function bounded(max: number) {
  return z.string().min(1).max(max).transform(stripControlCharacters).pipe(z.string().min(1))
}

export const identifierField = () => bounded(MAX_IDENTIFIER_CHARS)

export const sessionIdField = () =>
  bounded(MAX_IDENTIFIER_CHARS).refine(isUsableSessionId, {
    message: "a session id is letters, digits, dot, underscore or hyphen, and never ..",
  })

export const spokenValueField = () => bounded(MAX_VALUE_CHARS)

export const utteranceField = () => bounded(MAX_UTTERANCE_CHARS)

export const optionalUtteranceField = () =>
  z.string().max(MAX_UTTERANCE_CHARS).transform(stripControlCharacters).optional()
