import {
  artifactClassified,
  artifactEncyclopedia,
  artifactLetter,
  artifactNewspaper,
  artifactObituary,
  artifactPoster,
  artifactRadio,
  artifactTelegram,
} from './artifacts.js'
import { archivistAsk, grandInquiry } from './ask.js'
import { convergenceScan } from './convergence-scan.js'
import { courtAdvocate, courtJudge, courtSkeptic } from './court.js'
import { criticReview } from './critic-review.js'
import { derivePressures } from './derive-pressures.js'
import { eraGenerate } from './era-generate.js'
import { entityBiography, eraDeepDive, eventExpand } from './expanders.js'
import { eventInterpretation, historiographySchools } from './historiography.js'
import { podInterpret } from './pod-interpret.js'
import { podNormalize } from './pod-normalize.js'
import { pulse } from './pulse.js'
import { regenerateEvent } from './regenerate-event.js'
import { seedConsequences } from './seed-consequences.js'
import { eraSpecialist, eraSynthesize } from './symposium.js'
import type { PromptTemplate } from './types.js'

/**
 * The prompt registry (§4.7): every template, by id. The human-readable
 * registry table lives in docs/GENERATION.md and moves in lockstep with this
 * file - adding or bumping a template updates both in the same commit series.
 */
// biome-ignore lint/suspicious/noExplicitAny: heterogenous registry; call sites use the typed exports
export const PROMPT_REGISTRY: Record<string, PromptTemplate<any, any>> = {
  [podNormalize.id]: podNormalize,
  [podInterpret.id]: podInterpret,
  [seedConsequences.id]: seedConsequences,
  [criticReview.id]: criticReview,
  [regenerateEvent.id]: regenerateEvent,
  [derivePressures.id]: derivePressures,
  [eraGenerate.id]: eraGenerate,
  [eraSpecialist.id]: eraSpecialist,
  [eraSynthesize.id]: eraSynthesize,
  [courtAdvocate.id]: courtAdvocate,
  [courtSkeptic.id]: courtSkeptic,
  [courtJudge.id]: courtJudge,
  [convergenceScan.id]: convergenceScan,
  [pulse.id]: pulse,
  [eventExpand.id]: eventExpand,
  [eraDeepDive.id]: eraDeepDive,
  [entityBiography.id]: entityBiography,
  [historiographySchools.id]: historiographySchools,
  [eventInterpretation.id]: eventInterpretation,
  [archivistAsk.id]: archivistAsk,
  [grandInquiry.id]: grandInquiry,
  [artifactNewspaper.id]: artifactNewspaper,
  [artifactLetter.id]: artifactLetter,
  [artifactEncyclopedia.id]: artifactEncyclopedia,
  [artifactPoster.id]: artifactPoster,
  [artifactTelegram.id]: artifactTelegram,
  [artifactRadio.id]: artifactRadio,
  [artifactObituary.id]: artifactObituary,
  [artifactClassified.id]: artifactClassified,
}

export function templateVersions(): Array<{ id: string; version: string; role: string }> {
  return Object.values(PROMPT_REGISTRY).map((t) => ({ id: t.id, version: t.version, role: t.role }))
}
