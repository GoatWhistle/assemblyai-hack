import { STT_MODEL } from "@/domain"
import type { SttBegin } from "./protocol"

export const EXPECTED_STT_MODEL = STT_MODEL

export type ModelCheck =
  | { readonly kind: "match"; readonly model: string }
  | { readonly kind: "absent"; readonly model: null }
  | { readonly kind: "mismatch"; readonly model: string }

export function checkBeginModel(begin: SttBegin): ModelCheck {
  const reported = begin.configuration?.model
  if (typeof reported !== "string" || reported.trim().length === 0) {
    return { kind: "absent", model: null }
  }
  if (reported === EXPECTED_STT_MODEL) {
    return { kind: "match", model: reported }
  }
  return { kind: "mismatch", model: reported }
}
