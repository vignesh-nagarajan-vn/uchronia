import { EraBatchOut, SymposiumOut } from '@uchronia/schemas'
import type { EraGenerateArgs } from './era-generate.js'
import {
  ANTI_CLICHE_MANDATES,
  HANDLE_CONVENTIONS,
  HUMAN_VOICE,
  SENSITIVE_HISTORY_STANCE,
} from './fragments.js'
import type { PromptTemplate } from './types.js'

/** The symposium's chairs (v2/M17). */
export const SPECIALIST_DOMAINS = [
  'military',
  'economic',
  'cultural',
  'technological',
  'social',
] as const
export type SpecialistDomain = (typeof SPECIALIST_DOMAINS)[number]

const SPECIALIST_PERSONAE: Record<SpecialistDomain, string> = {
  military:
    'You hold the chair of military history: campaigns, logistics, recruitment, the price of garrisons, and what armies do to the societies that raise them.',
  economic:
    'You hold the chair of economic history: prices, credit, harvest and trade cycles, taxation, and who actually pays for every glorious decision.',
  cultural:
    'You hold the chair of cultural and intellectual history: belief, learning, language, art, and the slow machinery by which ideas become institutions.',
  technological:
    'You hold the chair of the history of technology: tools, techniques, their prerequisites, their diffusion, and the workshops between invention and consequence.',
  social:
    'You hold the chair of social and demographic history: households, migration, disease, labor, and the unnamed majorities every other chair forgets.',
}

export interface EraSpecialistArgs extends EraGenerateArgs {
  domain: SpecialistDomain
}

/**
 * Symposium stage 1 (v2/M17): one specialist drafts the era from their
 * chair's vantage. Three of these run per era, then the synthesizer merges.
 */
export const eraSpecialist: PromptTemplate<EraSpecialistArgs, EraBatchOut> = {
  id: 'era-specialist',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M17 symposium)'],
  role: 'generation',
  schemaName: 'EraBatchOut',
  schema: EraBatchOut,
  maxTokens: 8000,
  system: ({ dial, domain }) =>
    `You are one specialist in a symposium of historians deriving an alternate history. ${SPECIALIST_PERSONAE[domain]} Draft the era AS SEEN FROM YOUR CHAIR: your events foreground your domain's causation, while staying consistent with the shared world-state. Another historian will merge the drafts; disagree where your discipline genuinely would.

${dial.attractorLanguage}

${dial.axesLanguage}

${dial.voiceLanguage}

${HUMAN_VOICE}

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}

${HANDLE_CONVENTIONS}`,
  prompt: (args) => {
    const pressureLines = args.pressures
      .map((p) => `- ${p.name} (${p.kind}, intensity ${p.intensity}): ${p.description}`)
      .join('\n')
    const roster = args.entityRoster.map((e) => `- ${e.slug} (${e.type}): ${e.name}`).join('\n')
    return `Point of divergence, ${args.podDistanceYears} years before this era: ${args.podStatement}
Its mechanism: ${args.podMechanism}. Stay on its subject; generic period content is a failure.

Era to draft, from the ${args.domain} chair: years ${args.span.startYear} to ${args.span.endYear}.

Active pressures:
${pressureLines}

World-state snapshot (ground truth):
${args.stateSummary}

Recent events (referenceable as e<n>):
${args.recentEvents}

Entity roster (referenceable by slug):
${roster}

Draft ${Math.max(3, Math.ceil(args.batchSize * 0.7))} events from your chair's vantage: what YOUR discipline says this era does. Every event within the span, chronological, at least one state delta each, causes claimed honestly (e<n>/d<n>), at most 1 new entity, wildcard: false throughout (the synthesizer allocates wildcards). Also return an era title and 1-2 sentence summary as your chair would write them.`
  },
  seedKey: ({ span, ordinal, domain, dial }) =>
    `${span.startYear}-${span.endYear}|${ordinal}|${domain}|${dial.dial}`,
}

export interface EraSynthesizeArgs {
  podStatement: string
  podMechanism: string
  span: { startYear: number; endYear: number }
  batchSize: number
  wildcardBudget: number
  stateSummary: string
  recentEvents: string
  drafts: Array<{ domain: SpecialistDomain; title: string; summary: string; events: unknown }>
  dial: Parameters<typeof eraSpecialist.system>[0]['dial']
}

/**
 * Symposium stage 2 (v2/M17): merge the specialist drafts into one era,
 * preserving genuine disagreements as contested marks with readable notes.
 */
export const eraSynthesize: PromptTemplate<EraSynthesizeArgs, SymposiumOut> = {
  id: 'era-synthesize',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M17 symposium)'],
  role: 'generation',
  schemaName: 'SymposiumOut',
  schema: SymposiumOut,
  maxTokens: 9000,
  system: ({ dial }) =>
    `You chair a symposium of historians deriving an alternate history. Three specialists have drafted the same era from different disciplines. You merge their drafts into ONE coherent era: keep the strongest events, fold duplicate tellings together, balance the lenses, and PRESERVE genuine disagreements rather than smoothing them over - where two chairs read the same development differently, keep one event and record the dispute as a contested note, written like dry marginalia ("the economic chair reads this as fiscal collapse; the military chair as demobilization managed badly").

${dial.attractorLanguage}

${dial.axesLanguage}

${dial.voiceLanguage}

${HUMAN_VOICE}

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}

${HANDLE_CONVENTIONS}`,
  prompt: ({
    podStatement,
    podMechanism,
    span,
    batchSize,
    wildcardBudget,
    stateSummary,
    recentEvents,
    drafts,
  }) =>
    `Point of divergence: ${podStatement} (mechanism: ${podMechanism})
Era: years ${span.startYear} to ${span.endYear}.

World-state snapshot (ground truth):
${stateSummary}

Recent events (referenceable as e<n>):
${recentEvents}

The specialist drafts:
${drafts.map((d) => `=== the ${d.domain} chair ("${d.title}"): ${d.summary}\n${JSON.stringify(d.events, null, 1)}`).join('\n\n')}

Merge into exactly ${batchSize} events (relabel refs d1..d${batchSize}; rewrite causes to the new labels; keep every event inside the span, chronological, each with at least one delta). ${wildcardBudget > 0 ? `Exactly ${wildcardBudget} may be wildcards (wildcard: true) chosen from the drafts' most contingent material.` : 'No wildcards (wildcard: false everywhere).'} At most 2 new entities across the era. Return the merged era title and summary, and list contested refs where chairs genuinely disagreed, each with a one-sentence marginal note naming both readings.`,
  seedKey: ({ span, batchSize }) => `synth|${span.startYear}-${span.endYear}|${batchSize}`,
}
