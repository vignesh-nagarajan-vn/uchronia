import { EraBatchOut, type Pressure } from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import {
  ANTI_CLICHE_MANDATES,
  HANDLE_CONVENTIONS,
  HUMAN_VOICE,
  SENSITIVE_HISTORY_STANCE,
} from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface EraGenerateArgs {
  podStatement: string
  span: { startYear: number; endYear: number }
  ordinal: number
  /**
   * Years since this branch's OWN divergence (the fork, for children) - the
   * P2 discipline gradient. A branch forked a century downstream still opens
   * with few, local, high-confidence consequences.
   */
  distanceYears: number
  /** Years since the root point of divergence, for narrative framing. */
  podDistanceYears: number
  pressures: Pressure[]
  stateSummary: string
  recentEvents: string
  entityRoster: Array<{ slug: string; name: string; type: string }>
  batchSize: number
  wildcardBudget: number
  dial: DialParams
  subPodStatement: string | null
}

/**
 * Stage 3 (§4.1): one era of consequences, conditioned on the state snapshot
 * and the pressures - never on accumulated prose (P1). Distance from the POD
 * is a first-class input (P2): more degrees of freedom decades out.
 */
export const eraGenerate: PromptTemplate<EraGenerateArgs, EraBatchOut> = {
  id: 'era-generate',
  version: '1.3.0',
  changelog: [
    '1.0.0 - initial template',
    '1.1.0 - discipline measured from the branch origin; recent events carry causal marks; chain-extension mandate',
    '1.2.0 - entity lifecycle: terminal deltas (ends:true), roster excludes the dead',
    '1.3.0 - human voice mandate; prose register frays or steadies with the dial',
  ],
  role: 'generation',
  schemaName: 'EraBatchOut',
  schema: EraBatchOut,
  maxTokens: 8000,
  system: ({ dial }) =>
    `You are the engine of an alternate-history simulation, deriving one era of consequences from explicit world-state. You are disciplined: every event mutates state, claims its causes honestly, and stays within its era.

${dial.attractorLanguage}

${dial.voiceLanguage}

${HUMAN_VOICE}

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}

${HANDLE_CONVENTIONS}`,
  prompt: ({
    podStatement,
    span,
    distanceYears,
    podDistanceYears,
    pressures,
    stateSummary,
    recentEvents,
    entityRoster,
    batchSize,
    wildcardBudget,
    subPodStatement,
  }) => {
    const pressureLines = pressures
      .map((p) => `- ${p.name} (${p.kind}, intensity ${p.intensity}): ${p.description}`)
      .join('\n')
    const roster = entityRoster.map((e) => `- ${e.slug} (${e.type}): ${e.name}`).join('\n')
    const subPod = subPodStatement
      ? `\nThis branch carries a further divergence of its own, ${distanceYears} years before this era: ${subPodStatement}\n`
      : ''
    const wildcardRule =
      wildcardBudget > 0
        ? `Exactly ${wildcardBudget} of the events should be wildcards (wildcard: true): lower-probability contingencies a chronicler would call surprising - still causally reachable from the state, never arbitrary. Score their plausibility honestly (it will be lower).`
        : `No wildcards in this era (wildcard: false everywhere): every event should be structurally implied by the pressures.`

    return `Point of divergence, ${podDistanceYears} years before this era: ${podStatement}
${subPod}
Era to generate: years ${span.startYear} to ${span.endYear}.

Active pressures (these are the causes on the table - most events should discharge one or more):
${pressureLines}

World-state snapshot (ground truth):
${stateSummary}

Recent events (referenceable as e<n>):
${recentEvents}

Entity roster (referenceable by slug):
${roster}

Generate ${batchSize} events for this era. Rules:
- Every event's year lies within ${span.startYear}–${span.endYear}; order them chronologically.
- ${wildcardRule}
- Every event carries at least one state delta with a ledger-style note. Introduce at most 2 new entities across the whole era, only when the story genuinely needs a new actor.
- Entities can end. When an event kills a person, dissolves an institution, or extinguishes a movement for good, mark that delta ends:true. Ended entities never receive another delta and never act again; the snapshot lists them under "no longer extant". People age - a person active since the divergence may be due an ending.
- Claim causes: most events should cite at least one cause (e<n> or d<n>); use kinds precisely (causes / enables / prevents / accelerates / delays). The recent events show their own parents as [from e<n>] - prefer extending those live chains or visibly closing them over opening disconnected new ones.
- Spread lenses: across the era, at least one event must be primarily economic and at least one cultural or daily-life. ${distanceYears > 30 ? 'This far from the divergence, second-order consequences dominate: prices, schooling, custom, language.' : ''}
- Also return the era's title (the mood of this span, not its verdict) and a 1–2 sentence summary.`
  },
  seedKey: ({ span, ordinal, dial, batchSize }) =>
    `${span.startYear}-${span.endYear}|${ordinal}|${dial.dial}|${batchSize}`,
}
