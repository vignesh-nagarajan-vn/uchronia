import { PulseOut } from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import { SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

export interface PulseArgs {
  podStatement: string
  /** The event the reader is pulsing, as it stands. */
  event: { year: number; dateLabel: string; title: string; summary: string }
  /** The reader's flip; empty means "what if this had not happened at all". */
  flip: string
  stateSummary: string
  recentEvents: string
  /** Pressures live at this point in the branch. */
  pressures: Array<{ name: string; kind: string; intensity: number }>
  /** Convergences already recorded downstream, by anchor id and note. */
  convergences: Array<{ anchorId: string; note: string }>
  dial: DialParams
}

/**
 * The counterfactual pulse (v2/M19): one call, no commitment. Given local
 * world state and a flip, name the handful of consequences that actually
 * follow. This is a forecast the reader can accept by forking, so it is
 * explicitly allowed (required, in fact) to be short and to say when a flip
 * changes very little.
 */
export const pulse: PromptTemplate<PulseArgs, PulseOut> = {
  id: 'pulse',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M19)'],
  role: 'generation',
  schemaName: 'PulseOut',
  schema: PulseOut,
  maxTokens: 2000,
  system: ({ dial }) =>
    `You forecast the local consequences of changing one event in an alternate history. You are not writing history here: you are answering "what would this actually move?" in the smallest honest number of claims.

Discipline: every predicted consequence must be reachable from the world-state you are given. Do not invent actors. Do not reach for drama. If a flip changes very little, say so plainly and return few, low-confidence deltas: a forecast that everything changes is the same as no forecast at all.

${dial.attractorLanguage}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, event, flip, stateSummary, recentEvents, pressures, convergences }) =>
    `Point of divergence: ${podStatement}

The event under the pulse (${event.dateLabel}): ${event.title}
${event.summary}

The flip: ${flip.trim().length > 0 ? flip : 'this event does not happen at all'}

World-state at this point (ground truth):
${stateSummary}

Recent events:
${recentEvents}

Pressures live here:
${pressures.map((p) => `- ${p.name} (${p.kind}, intensity ${p.intensity})`).join('\n') || '(none recorded)'}

Convergences already recorded downstream:
${convergences.map((c) => `- ${c.anchorId}: ${c.note}`).join('\n') || '(none)'}

Return:
- headline: one sentence naming what the flip actually changes. Not a summary of the event.
- deltas: 3 to 8 predicted consequences. Each names its kind (entity, pressure, or convergence), its subject (an entity slug from the state, a pressure name from the list, or an anchor id from the convergences), the effect in one clause, and a confidence 0-1 that measures how firmly it follows from the state, not how interesting it is.
- breaks: anchor ids of the convergences above that this flip most likely breaks. Empty is a perfectly good answer.
- suggestedSubPod: the single sentence a forked branch would open with, written as a settled statement of fact in this history's voice ("Constantine XI dies of plague in the winter of 1454."), not as a question.`,
  seedKey: ({ event, flip }) => `${event.year}|${event.title}|${flip}`,
}
