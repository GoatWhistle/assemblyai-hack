export class ReadbackError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = new.target.name
    this.code = code
  }
}

export class InvalidWordSpanError extends ReadbackError {
  constructor(message: string) {
    super("INVALID_WORD_SPAN", message)
  }
}

export class EmptyProvenanceError extends ReadbackError {
  constructor(message = "a value with no source words has no provenance") {
    super("EMPTY_PROVENANCE", message)
  }
}

export class GateViolationError extends ReadbackError {
  constructor(message: string) {
    super("GATE_VIOLATION", message)
  }
}

export class UnknownFieldError extends ReadbackError {
  constructor(field: string) {
    super("UNKNOWN_FIELD", `no policy is defined for field ${field}`)
  }
}

export class NormalizationError extends ReadbackError {
  constructor(message: string) {
    super("NORMALIZATION_FAILED", message)
  }
}

export class CatalogUnavailableError extends ReadbackError {
  constructor(message: string) {
    super("CATALOG_UNAVAILABLE", message)
  }
}

export class ToolAuthError extends ReadbackError {
  constructor(message = "the shared tool secret did not match") {
    super("TOOL_AUTH_FAILED", message)
  }
}

export class EchoTurnError extends ReadbackError {
  constructor(message: string) {
    super("ECHO_TURN_REJECTED", message)
  }
}

export class SessionStorageError extends ReadbackError {
  constructor(message: string) {
    super("SESSION_STORAGE_UNCONFIGURED", message)
  }
}

export class UpstreamError extends ReadbackError {
  readonly status: number

  constructor(status: number, message: string) {
    super("UPSTREAM_FAILED", message)
    this.status = status
  }
}
