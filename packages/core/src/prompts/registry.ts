import {
  artifactEncyclopedia,
  artifactLetter,
  artifactNewspaper,
  artifactPoster,
} from './artifacts.js'
import { convergenceScan } from './convergence-scan.js'
import { criticReview } from './critic-review.js'
import { derivePressures } from './derive-pressures.js'
import { eraGenerate } from './era-generate.js'
import { entityBiography, eraDeepDive, eventExpand } from './expanders.js'
import { podNormalize } from './pod-normalize.js'
import { regenerateEvent } from './regenerate-event.js'
import { seedConsequences } from './seed-consequences.js'
import type { PromptTemplate } from './types.js'

/**
 * The prompt registry (§4.7): every template, by id. The human-readable
 * registry table lives in docs/GENERATION.md and moves in lockstep with this
 * file — adding or bumping a template updates both in the same commit series.
 */
// biome-ignore lint/suspicious/noExplicitAny: heterogenous registry; call sites use the typed exports
export const PROMPT_REGISTRY: Record<string, PromptTemplate<any, any>> = {
  [podNormalize.id]: podNormalize,
  [seedConsequences.id]: seedConsequences,
  [criticReview.id]: criticReview,
  [regenerateEvent.id]: regenerateEvent,
  [derivePressures.id]: derivePressures,
  [eraGenerate.id]: eraGenerate,
  [convergenceScan.id]: convergenceScan,
  [eventExpand.id]: eventExpand,
  [eraDeepDive.id]: eraDeepDive,
  [entityBiography.id]: entityBiography,
  [artifactNewspaper.id]: artifactNewspaper,
  [artifactLetter.id]: artifactLetter,
  [artifactEncyclopedia.id]: artifactEncyclopedia,
  [artifactPoster.id]: artifactPoster,
}

export function templateVersions(): Array<{ id: string; version: string; role: string }> {
  return Object.values(PROMPT_REGISTRY).map((t) => ({ id: t.id, version: t.version, role: t.role }))
}
