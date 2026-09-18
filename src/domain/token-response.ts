export type VendorTokenPayload = {
  readonly token?: unknown
}

export type TokenResponseFields = {
  readonly token: string
  readonly expiresInSeconds: number
  readonly maxSessionDurationSeconds: number
}

export function vendorTokenOf(body: unknown): string | undefined {
  if (typeof body !== "object" || body === null) {
    return undefined
  }
  const token = (body as VendorTokenPayload).token
  return typeof token === "string" ? token : undefined
}

export function allowlistedTokenFields(input: {
  token: string
  expiresInSeconds: number
  maxSessionDurationSeconds: number
}): TokenResponseFields {
  return Object.freeze({
    token: input.token,
    expiresInSeconds: input.expiresInSeconds,
    maxSessionDurationSeconds: input.maxSessionDurationSeconds,
  })
}
