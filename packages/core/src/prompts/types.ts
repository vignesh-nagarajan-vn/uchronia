import type { z } from 'zod'
import type { ProviderRole, StructuredRequest } from '../llm.js'

/**
 * One prompt template: id + semver version + changelog (§4.7). Templates are
 * pure functions from typed args to prompt text; the registry table lives in
 * docs/GENERATION.md and moves in lockstep with these files.
 */
export interface PromptTemplate<A, T> {
  id: string
  version: string
  /** Newest first. Every edit appends here and bumps `version`. */
  changelog: readonly string[]
  role: ProviderRole
  schemaName: string
  schema: z.ZodType<T>
  maxTokens: number
  system: (args: A) => string
  prompt: (args: A) => string
  /** Stable seed for deterministic mock output. Defaults to JSON of args. */
  seedKey?: (args: A) => string
}

export function buildRequest<A, T>(template: PromptTemplate<A, T>, args: A): StructuredRequest {
  return {
    templateId: template.id,
    templateVersion: template.version,
    role: template.role,
    system: template.system(args),
    prompt: template.prompt(args),
    schemaName: template.schemaName,
    schema: template.schema,
    maxTokens: template.maxTokens,
    args,
    seedKey: template.seedKey ? template.seedKey(args) : JSON.stringify(args),
  }
}
