import { podNormalize } from './pod-normalize.js'
import type { PromptTemplate } from './types.js'

/**
 * The prompt registry (§4.7): every template, by id. The human-readable
 * registry table lives in docs/GENERATION.md and moves in lockstep with this
 * file — adding or bumping a template updates both in the same commit series.
 */
// biome-ignore lint/suspicious/noExplicitAny: heterogenous registry; call sites use the typed exports
export const PROMPT_REGISTRY: Record<string, PromptTemplate<any, any>> = {
  [podNormalize.id]: podNormalize,
}

export function templateVersions(): Array<{ id: string; version: string; role: string }> {
  return Object.values(PROMPT_REGISTRY).map((t) => ({ id: t.id, version: t.version, role: t.role }))
}
