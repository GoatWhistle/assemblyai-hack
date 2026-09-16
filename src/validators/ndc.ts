import { makeVerdict, type ValidatorVerdict, VerdictOutcome } from "@/domain"

const TEN_DIGIT_SHAPES = ["4-4-2", "5-3-2", "5-4-1"] as const
const ELEVEN_DIGIT_SHAPE = "5-4-2"

function segmentShape(value: string): string | null {
  const segments = value.split("-")
  if (segments.length !== 3) {
    return null
  }
  if (!segments.every((s) => /^\d+$/.test(s))) {
    return null
  }
  return segments.map((s) => s.length).join("-")
}

export function validateNdcFormat(raw: string): ValidatorVerdict {
  const value = raw.trim()
  const shape = segmentShape(value)

  if (shape === null) {
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "ndc_format",
      detail: "an NDC is three hyphen-separated groups of digits, for example 0093-1036-01",
      checkedValue: raw,
      evidence: { acceptedShapes: [...TEN_DIGIT_SHAPES, ELEVEN_DIGIT_SHAPE].join(", ") },
    })
  }

  const digitCount = value.replace(/-/g, "").length
  const accepted =
    digitCount === 11
      ? shape === ELEVEN_DIGIT_SHAPE
      : digitCount === 10 && (TEN_DIGIT_SHAPES as readonly string[]).includes(shape)

  if (!accepted) {
    const expected = digitCount === 11 ? ELEVEN_DIGIT_SHAPE : TEN_DIGIT_SHAPES.join(" or ")
    return makeVerdict({
      outcome: VerdictOutcome.FormatInvalid,
      validatorName: "ndc_format",
      detail: `${digitCount} digits grouped ${shape}; an NDC of that length must be grouped ${expected}`,
      checkedValue: value,
      evidence: { shape, digitCount, expected },
    })
  }

  return makeVerdict({
    outcome: VerdictOutcome.Passed,
    validatorName: "ndc_format",
    detail: `${digitCount} digits grouped ${shape} is a valid NDC layout; the layout is all this check proves, an NDC carries no check digit`,
    checkedValue: value,
    evidence: { shape, digitCount, hasCheckDigit: false },
  })
}
