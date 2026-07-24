import type { z } from 'zod'
import { UchroniaError } from './errors.js'

export type ProviderRole = 'generation' | 'critic' | 'utility'
export type ProviderMode = 'mock' | 'live'

/**
 * One structured completion request. The prompt/system strings are what a live
 * model sees; `args` carries the same inputs structurally so the MockProvider
 * can synthesize deterministic output without parsing prose.
 */
export interface StructuredRequest {
  templateId: string
  templateVersion: string
  role: ProviderRole
  system: string
  prompt: string
  schemaName: string
  /** Zod schema for the expected output; live providers may derive a JSON schema from it. */
  schema: z.ZodType
  maxTokens: number
  /** The template's structured inputs, verbatim. */
  args: unknown
  /** Stable string the mock seeds its RNG with. */
  seedKey: string
  /** Cooperative cancellation: live providers pass this to their HTTP layer. */
  signal?: AbortSignal
}

/** What one completion cost, when the provider knows. */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
}

export interface StructuredResult {
  /** Parsed JSON value. NOT yet schema-validated — the pipeline validates and repairs. */
  value: unknown
  raw: string
  model: string
  mode: ProviderMode
  /** Absent for providers that meter nothing (the mock). */
  usage?: TokenUsage
}

/** The port. Implementations: MockProvider (core), AnthropicProvider (server). */
export interface LLMProvider {
  readonly mode: ProviderMode
  complete(request: StructuredRequest): Promise<StructuredResult>
}

// ------------------------------------------------------------ error taxonomy

export class ProviderError extends UchroniaError {
  readonly retryable: boolean
  constructor(code: string, message: string, retryable: boolean) {
    super(code, message)
    this.retryable = retryable
  }
}

export class ProviderAuthError extends ProviderError {
  constructor(message: string) {
    super('provider-auth', message, false)
  }
}

export class ProviderRateLimitError extends ProviderError {
  constructor(message: string) {
    super('provider-rate-limit', message, true)
  }
}

export class ProviderOverloadedError extends ProviderError {
  constructor(message: string) {
    super('provider-overloaded', message, true)
  }
}

export class ProviderNetworkError extends ProviderError {
  constructor(message: string) {
    super('provider-network', message, true)
  }
}

/** The model answered, but not in a usable shape (refusal, empty, non-JSON). */
export class ProviderResponseError extends ProviderError {
  constructor(message: string) {
    super('provider-response', message, false)
  }
}
