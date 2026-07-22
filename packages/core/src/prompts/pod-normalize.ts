import { PodNormalizedOut } from '@uchronia/schemas'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface PodNormalizeArgs {
  raw: string
}

/**
 * Stage 1 (§4.1): freeform user text → normalized PointOfDivergence fields,
 * including a short baseline-context summary of the real situation at that
 * date. Utility-tier call.
 */
export const podNormalize: PromptTemplate<PodNormalizeArgs, PodNormalizedOut> = {
  id: 'pod-normalize',
  version: '1.0.0',
  changelog: ['1.0.0 — initial template'],
  role: 'utility',
  schemaName: 'PodNormalizedOut',
  schema: PodNormalizedOut,
  maxTokens: 1500,
  system: () =>
    `You are the intake clerk of an alternate-history engine. You turn a user's freeform point of divergence into a precise, normalized record. You know real history well and you keep to it for the baseline context.

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ raw }) =>
    `Normalize this point of divergence:

<pod>
${raw}
</pod>

Produce:
- statement: one declarative sentence stating what happens differently (not a question).
- year: the integer year the divergence occurs (negative for BC; no year zero). If the user gave none, choose the historically sensible moment for this divergence.
- dateLabel: a human date label ("May 1453", "c. 48 BC").
- region: the primary region affected.
- mechanism: which lever the divergence pulls — knowledge, disease, politics, technology, economics, environment, or culture.
- baselineContext: 2–3 sentences on what actually happened in real history at and around this moment — the situation the divergence departs from.
- suggestedTitle: a short evocative title for this timeline (3–6 words, no colon-subtitle).`,
  seedKey: ({ raw }) => raw.trim().toLowerCase(),
}
