import { PodInterpretedOut } from '@uchronia/schemas'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface PodInterpretArgs {
  raw: string
  /** Retrieved curated anchors near the ask - the real record to ground on. */
  anchors: Array<{ year: number; title: string; summary: string; region: string }>
}

/**
 * Stage 1 of intake, v2 (M14): interpret the user's freeform divergence
 * against retrieved baseline anchors, and offer concrete candidate mechanisms
 * instead of guessing silently. Generation-tier: this is one small call per
 * timeline and the highest-leverage call in the product - if the reading is
 * wrong, everything derived from it answers the wrong question.
 */
export const podInterpret: PromptTemplate<PodInterpretArgs, PodInterpretedOut> = {
  id: 'pod-interpret',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2 intake: retrieval-grounded, candidate mechanisms)'],
  role: 'generation',
  schemaName: 'PodInterpretedOut',
  schema: PodInterpretedOut,
  maxTokens: 3000,
  system: () =>
    `You are the intake historian of an alternate-history engine. A user describes a divergence in their own words; you interpret exactly what they asked, grounded in the real record, and you offer the concrete historical hinges through which that divergence could actually happen. You never substitute a different, easier question for the one asked.

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ raw, anchors }) => {
    const anchorLines =
      anchors.length > 0
        ? anchors
            .map((a) => {
              const label = a.year < 0 ? `${Math.abs(a.year)} BC` : String(a.year)
              return `- ${label} · ${a.title} (${a.region}): ${a.summary}`
            })
            .join('\n')
        : '(no curated anchors matched this ask - ground on your own knowledge, carefully)'
    return `The user's divergence, verbatim:

<pod>
${raw}
</pod>

Curated real-history anchors retrieved for this ask (ground on these where they apply):
${anchorLines}

Interpret the divergence:
- statement: one declarative sentence stating what happens differently, faithful to what was ASKED (not a question; not a different event).
- year: the integer year the divergence occurs (negative for BC; no year zero). This must be the historically correct moment for the asked divergence - "the Allies lose World War 2" belongs in 1939-1945, never elsewhere.
- dateLabel: a human date label ("September 1940", "c. 48 BC").
- region: the primary region affected.
- mechanism: which lever the divergence pulls - knowledge, disease, politics, technology, economics, environment, or culture.
- baselineContext: 2-3 sentences on what actually happened in real history at and around this moment.
- suggestedTitle: a short evocative title for this timeline (3-6 words, no colon-subtitle).
- confidence: 0-1, how sure you are this reading is what the user meant. Vague or contradictory asks score low; clear named events score high.
- ambiguities: named ambiguities in the ask (empty array when clear). "Which theatre?" and "which year of a span?" belong here.
- candidates: 2-4 concrete, historically real mechanisms through which the asked divergence could occur, each with label, year, dateLabel, region, mechanism, and a one-line rationale. These must be hinges historians genuinely argue about, not inventions. The first candidate is your primary reading and must agree with the top-level fields.
- clarifyingQuestion: null when confidence >= 0.55. Below that, exactly one question with 2-4 short options (usually the candidate labels). Never more than one round.`
  },
  seedKey: ({ raw }) => raw.trim().toLowerCase(),
}
