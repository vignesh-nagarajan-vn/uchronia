import { EraBatchOut, type PointOfDivergence } from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import {
  ANTI_CLICHE_MANDATES,
  HANDLE_CONVENTIONS,
  HUMAN_VOICE,
  SENSITIVE_HISTORY_STANCE,
} from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface SeedArgs {
  pod: Pick<
    PointOfDivergence,
    'statement' | 'year' | 'dateLabel' | 'region' | 'mechanism' | 'baselineContext'
  >
  dial: DialParams
}

/**
 * Stage 2 (§4.1): the first ~0–2 years after the divergence. Few events, high
 * confidence, tightly disciplined (P2: near the POD, consequences are scarce
 * and local). This batch also founds the entity roster.
 */
export const seedConsequences: PromptTemplate<SeedArgs, EraBatchOut> = {
  id: 'seed-consequences',
  version: '1.1.0',
  changelog: [
    '1.0.0 — initial template',
    '1.1.0 — human voice mandate; prose register tracks the dial',
  ],
  role: 'generation',
  schemaName: 'EraBatchOut',
  schema: EraBatchOut,
  maxTokens: 6000,
  system: ({ dial }) =>
    `You are the engine of an alternate-history simulation. You derive consequences from a point of divergence with the discipline of a historian: grounded in the attested situation, propagating outward through named entities whose state you mutate explicitly.

${dial.attractorLanguage}

${dial.voiceLanguage}

${HUMAN_VOICE}

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}

${HANDLE_CONVENTIONS}`,
  prompt: ({ pod }) =>
    `Point of divergence (${pod.dateLabel}, ${pod.region}, mechanism: ${pod.mechanism}):
${pod.statement}

What actually happened in real history at this moment:
${pod.baselineContext}

Generate the SEED CONSEQUENCES: the first zero to two years only (years ${pod.year} to ${pod.year + 2}).

Rules for the seed:
- 3 to 5 events, all high-confidence (plausibility ≥ 0.6, wildcard: false for every event). This close to the divergence, consequences are few, local, and disciplined.
- The first event (d1) is the divergence itself landing: what observers at the time actually notice.
- Found the entity roster: introduce 3 to 6 entities via newEntities, the polities, people, and institutions this history will track. At least one must NOT be a state or ruler (an institution, technology, or movement). Give each a slug, a one-line description, and 2–4 initialState facts.
- Every event mutates state: at least one delta per event, with a note written like a ledger annotation.
- Claim causes honestly: within-batch refs (d1, d2, …) where one seed event genuinely produces another.
- Spread lenses across the batch: at least one event must be primarily economic or daily-life, not political.
- Also return an era title and a 1–2 sentence summary for this opening span. The title names the mood of the moment, not the whole future.`,
  seedKey: ({ pod, dial }) => `${pod.statement}|${pod.year}|${dial.dial}`,
}
