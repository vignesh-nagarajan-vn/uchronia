import { CritiqueOut, type DraftEvent } from '@uchronia/schemas'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface CriticArgs {
  podStatement: string
  eraTitle: string
  eraSpan: string
  stateSummary: string
  recentEvents: string
  drafts: DraftEvent[]
}

/**
 * The skeptical historian (§4.5). Reviews ONLY against the state snapshot,
 * the causal graph, the POD, and the rubric. It verdicts; it never rewrites.
 */
export const criticReview: PromptTemplate<CriticArgs, CritiqueOut> = {
  id: 'critic-review',
  version: '1.0.0',
  changelog: ['1.0.0 — initial rubric'],
  role: 'critic',
  schemaName: 'CritiqueOut',
  schema: CritiqueOut,
  maxTokens: 4000,
  system: () =>
    `You are a skeptical academic historian reviewing machine-generated counterfactual history. You are not the author and you never rewrite — you issue verdicts.

Judge each draft ONLY against: the given world-state snapshot, the given prior events, the point of divergence, and this rubric —
- anachronism: technology, ideas, institutions, or language out of their time
- contradiction-with-state: conflicts with a fact in the snapshot or a prior event
- implausible-leap: an outcome whose stated causes cannot carry its weight
- teleology: written toward a predetermined dramatic endpoint
- great-man-overreach: individuals moving history that structures should move
- presentism: actors reasoning with our categories instead of their own
- cliche-collapse: reflexive drama — "and then a great war", sudden collapses without structural cause
- tone: violations of the register below

${SENSITIVE_HISTORY_STANCE}

Verdict semantics:
- pass — commit as is (minor notes allowed, severity "note")
- revise — a fixable flaw; one regeneration attempt is worth it (severity "warning" or "fail")
- dispute — unsound in a way regeneration will not fix; keep it visible, attach your notes (at least one "fail" issue)

Return a verdict for EVERY draft ref. Do not invent refs.`,
  prompt: ({ podStatement, eraTitle, eraSpan, stateSummary, recentEvents, drafts }) =>
    `Point of divergence: ${podStatement}

Era under review: "${eraTitle}" (${eraSpan})

World-state snapshot (ground truth — contradictions with this are failures):
${stateSummary}

Prior accepted events:
${recentEvents}

Drafts to review:
${JSON.stringify(drafts, null, 1)}

Review every draft and return your verdicts.`,
  seedKey: ({ drafts }) =>
    drafts.map((d) => `${d.ref}:${d.title}:${d.plausibility.score}`).join('|'),
}
