import { CourtBriefOut, CourtRulingOut, type DraftEvent } from '@uchronia/schemas'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/**
 * The Court of Plausibility (v2/M17): one bounded adversarial exchange over a
 * critic-disputed event. Advocate and skeptic brief on the critic tier; the
 * judge rules on the generation tier. One exchange, no loops.
 */

export interface CourtBriefArgs {
  podStatement: string
  eraSpan: string
  stateSummary: string
  causeGlossary: string
  draft: DraftEvent
  criticIssues: string[]
}

export const courtAdvocate: PromptTemplate<CourtBriefArgs, CourtBriefOut> = {
  id: 'court-advocate',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M17)'],
  role: 'critic',
  schemaName: 'CourtBriefOut',
  schema: CourtBriefOut,
  maxTokens: 1200,
  system: () =>
    `You are the advocate before the Court of Plausibility. A drafted event stands accused of implausibility. Argue, in one tight paragraph, the STRONGEST honest case that the event should stand as written: cite its causes, the world-state, and historical parallels. Never invent facts not in the record given to you.

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, eraSpan, stateSummary, causeGlossary, draft, criticIssues }) =>
    `Divergence: ${podStatement}
Era: ${eraSpan}

World-state (ground truth):
${stateSummary}

Cited causes resolve to:
${causeGlossary}

The accused event:
${JSON.stringify(draft, null, 1)}

The critic's objections:
${criticIssues.map((i) => `- ${i}`).join('\n')}

Deliver the advocate's brief (one paragraph).`,
  seedKey: ({ draft }) => `advocate:${draft.ref}:${draft.title}`,
}

export const courtSkeptic: PromptTemplate<CourtBriefArgs, CourtBriefOut> = {
  id: 'court-skeptic',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M17)'],
  role: 'critic',
  schemaName: 'CourtBriefOut',
  schema: CourtBriefOut,
  maxTokens: 1200,
  system: () =>
    `You are the skeptic before the Court of Plausibility. A drafted event is defended as plausible. Argue, in one tight paragraph, the STRONGEST honest case against it: where the cited causes cannot carry the outcome, what the world-state contradicts, which historical pattern it violates. Never invent facts not in the record given to you.

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, eraSpan, stateSummary, causeGlossary, draft, criticIssues }) =>
    `Divergence: ${podStatement}
Era: ${eraSpan}

World-state (ground truth):
${stateSummary}

Cited causes resolve to:
${causeGlossary}

The defended event:
${JSON.stringify(draft, null, 1)}

The critic's original objections (sharpen or replace them):
${criticIssues.map((i) => `- ${i}`).join('\n')}

Deliver the skeptic's brief (one paragraph).`,
  seedKey: ({ draft }) => `skeptic:${draft.ref}:${draft.title}`,
}

export interface CourtJudgeArgs extends CourtBriefArgs {
  advocateBrief: string
  skepticBrief: string
}

export const courtJudge: PromptTemplate<CourtJudgeArgs, CourtRulingOut> = {
  id: 'court-judge',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M17)'],
  role: 'generation',
  schemaName: 'CourtRulingOut',
  schema: CourtRulingOut,
  maxTokens: 1500,
  system: () =>
    `You are the judge of the Court of Plausibility. Two briefs argue over a drafted event in an alternate history. Rule once, without appeal:
- uphold: the event stands as written; the objections do not survive the advocate's case.
- revise: the event's core is sound but a stated flaw must be fixed; give one concrete instruction for the retelling.
- dispute: the event is unsound in a way no retelling fixes, but the history keeps it visibly marked.
Write a short opinion (2-4 sentences) a reader of the ledger would find fair, naming which argument carried and why.

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, eraSpan, stateSummary, draft, advocateBrief, skepticBrief }) =>
    `Divergence: ${podStatement}
Era: ${eraSpan}

World-state (ground truth):
${stateSummary}

The event on trial:
${JSON.stringify(draft, null, 1)}

The advocate:
${advocateBrief}

The skeptic:
${skepticBrief}

Rule now: outcome, opinion, and (only for revise) the instruction.`,
  seedKey: ({ draft }) => `judge:${draft.ref}:${draft.title}`,
}
