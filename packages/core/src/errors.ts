/**
 * Typed error taxonomy (§11.2). Three families:
 *  - domain errors (this file): integrity, immutability, missing rows
 *  - validation errors: generated output that failed schema or rule checks
 *  - provider errors: the LLM boundary (added with the provider port)
 */
export class UchroniaError extends Error {
  readonly code: string
  constructor(code: string, message: string) {
    super(message)
    this.name = new.target.name
    this.code = code
  }
}

/** A referenced row does not exist. */
export class NotFoundError extends UchroniaError {
  constructor(kind: string, id: string) {
    super('not-found', `${kind} not found: ${id}`)
  }
}

/** A mutation would corrupt referential or ordinal integrity. */
export class IntegrityError extends UchroniaError {
  constructor(message: string) {
    super('integrity', message)
  }
}

/** A mutation attempted to alter history a branch does not own (§3 fork semantics). */
export class PreForkImmutableError extends UchroniaError {
  constructor(message: string) {
    super('pre-fork-immutable', message)
  }
}

/** LLM output failed schema validation after the bounded repair loop. */
export class GenerationValidationError extends UchroniaError {
  readonly issues: string[]
  constructor(templateId: string, issues: string[]) {
    super('generation-validation', `output of ${templateId} failed validation after retries`)
    this.issues = issues
  }
}
