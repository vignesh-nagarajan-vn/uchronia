import { type DraftEvent, RegeneratedEventOut } from '@uchronia/schemas'
import { ANTI_CLICHE_MANDATES, HANDLE_CONVENTIONS, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface RegenerateArgs {
  podStatement: string
  eraTitle: string
  eraSpan: string
  stateSummary: string
  draft: DraftEvent
  issues: string[]
}

/** One bounded replacement attempt for a draft the review flagged (§P4). */
export const regenerateEvent: PromptTemplate<RegenerateArgs, RegeneratedEventOut> = {
  id: 'regenerate-event',
  version: '1.0.0',
  changelog: ['1.0.0 — initial template'],
  role: 'generation',
  schemaName: 'RegeneratedEventOut',
  schema: RegeneratedEventOut,
  maxTokens: 2500,
  system: () =>
    `You repair one flagged event in an alternate-history simulation. Fix exactly what the review flagged; keep everything that was sound. The replacement keeps the same ref, stays within the era's years, and only references entity slugs and event refs that already appear in the draft or the context.

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}

${HANDLE_CONVENTIONS}`,
  prompt: ({ podStatement, eraTitle, eraSpan, stateSummary, draft, issues }) =>
    `Point of divergence: ${podStatement}
Era: "${eraTitle}" (${eraSpan})

World-state snapshot:
${stateSummary}

The flagged draft:
${JSON.stringify(draft, null, 1)}

Review findings to fix:
${issues.map((i) => `- ${i}`).join('\n')}

Return the corrected draft (same ref: ${draft.ref}).`,
  seedKey: ({ draft, issues }) => `${draft.ref}:${draft.title}:${issues.length}`,
}
