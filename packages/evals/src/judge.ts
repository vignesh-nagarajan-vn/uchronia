import type { PromptTemplate } from '@uchronia/core'
import { z } from 'zod'

/**
 * The relevance judge (v2/M15): a generation-tier model scores a derived
 * opening (interpretation + seed + first era) against the ask on a 1-5
 * rubric. Thresholds live in docs/EVALS.md; the WW2 gate requires relevance
 * mean >= 4.0 with no POD below 3.
 */
export const JudgeOut = z.object({
  relevanceToPod: z.number().int().min(1).max(5),
  eraFit: z.number().int().min(1).max(5),
  anachronism: z.number().int().min(1).max(5),
  tone: z.number().int().min(1).max(5),
  convergenceSanity: z.number().int().min(1).max(5),
  notes: z.string(),
})
export type JudgeOut = z.infer<typeof JudgeOut>

export interface JudgeArgs {
  podText: string
  interpretation: string
  events: Array<{ year: number; title: string; summary: string }>
}

export const relevanceJudge: PromptTemplate<JudgeArgs, JudgeOut> = {
  id: 'eval-relevance-judge',
  version: '1.0.0',
  changelog: ['1.0.0 - initial rubric (v2/M15; eval tooling, not in the product registry)'],
  role: 'generation',
  schemaName: 'JudgeOut',
  schema: JudgeOut,
  maxTokens: 1200,
  system: () =>
    'You are a strict evaluator of an alternate-history engine. You score outputs on a 1-5 rubric and justify briefly. You are not the author; be skeptical, and reserve 5s for flawless work.',
  prompt: ({ podText, interpretation, events }) =>
    `A user asked this alternate-history engine:

<ask>
${podText}
</ask>

The engine's interpretation of the ask:
${interpretation}

The first events it derived:
${events.map((e) => `- ${e.year}: ${e.title} | ${e.summary}`).join('\n')}

Score each dimension 1-5 (5 = flawless):
- relevanceToPod: do the interpretation and every derived event answer THIS ask, in its correct period and theatre? A canned or off-period history scores 1.
- eraFit: do the events belong to their years (institutions, vocabulary, scale)?
- anachronism: 5 = none; deduct for technology, ideas, or language out of time.
- tone: sober historiographic register; no glorification of atrocity; no machine mannerisms.
- convergenceSanity: do the events follow plausibly from the divergence rather than jumping to unearned outcomes?
Also return one or two sentences of notes naming the biggest weakness.`,
  seedKey: ({ podText }) => `judge:${podText}`,
}
