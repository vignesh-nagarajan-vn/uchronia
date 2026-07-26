import { BiographyOut, ExpandOut } from '@uchronia/schemas'
import { ANTI_CLICHE_MANDATES, HUMAN_VOICE, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/** Shared system voice for the lazy expanders (§4.1 stage 5, P5). */
const expanderSystem = (
  voice: string,
) => `You write the deep layer of an alternate-history chronicle: measured, specific, historiographic. You elaborate only what the given state and events support; expansion adds texture and mechanism, never new facts that would belong in the ledger.

${voice}

${HUMAN_VOICE}

${ANTI_CLICHE_MANDATES}

${SENSITIVE_HISTORY_STANCE}`

export interface EventExpandArgs {
  podStatement: string
  event: { title: string; summary: string; dateLabel: string; year: number; lenses: string[] }
  stateSummary: string
  causeSummaries: string[]
  effectSummaries: string[]
  /** The dial's prose register. */
  voice: string
}

export const eventExpand: PromptTemplate<EventExpandArgs, ExpandOut> = {
  id: 'event-expand',
  version: '1.1.0',
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'ExpandOut',
  schema: ExpandOut,
  maxTokens: 2500,
  system: ({ voice }) => expanderSystem(voice),
  prompt: ({ podStatement, event, stateSummary, causeSummaries, effectSummaries }) =>
    `Divergence: ${podStatement}

Event to expand, "${event.title}" (${event.dateLabel}):
${event.summary}

World-state as of this event:
${stateSummary}

Its recorded causes:
${causeSummaries.length ? causeSummaries.map((s) => `- ${s}`).join('\n') : '- (none recorded)'}

What it went on to shape:
${effectSummaries.length ? effectSummaries.map((s) => `- ${s}`).join('\n') : '- (nothing yet)'}

Write the expanded narrative: 2–4 paragraphs. Ground every claim in the state and causes above; give mechanism, texture, and the view from below (what it looked like to people living it), not just the view from the chancery. No headings, no lists; prose.`,
  seedKey: ({ event }) => `${event.title}|${event.year}`,
}

export interface EraDeepDiveArgs {
  podStatement: string
  era: { title: string; summary: string; startYear: number; endYear: number }
  pressureLines: string[]
  eventLines: string[]
  /** The dial's prose register. */
  voice: string
}

export const eraDeepDive: PromptTemplate<EraDeepDiveArgs, ExpandOut> = {
  id: 'era-deepdive',
  version: '1.1.0',
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'ExpandOut',
  schema: ExpandOut,
  maxTokens: 3000,
  system: ({ voice }) => expanderSystem(voice),
  prompt: ({ podStatement, era, pressureLines, eventLines }) =>
    `Divergence: ${podStatement}

Era "${era.title}" (${era.startYear}–${era.endYear}):
${era.summary}

The pressures that drove it:
${pressureLines.length ? pressureLines.map((s) => `- ${s}`).join('\n') : '- (the opening span; pressures not yet named)'}

Its events:
${eventLines.map((s) => `- ${s}`).join('\n')}

Write the era essay: 3–5 paragraphs that read the span as a historian would. What the pressures demanded, how the events discharged or deferred them, what was settled and what was left loaded for the next era. Prose only.`,
  seedKey: ({ era }) => `${era.title}|${era.startYear}`,
}

export interface BiographyArgs {
  podStatement: string
  entity: { name: string; type: string; description: string }
  stateLine: string
  ledgerLines: string[]
  relatedEvents: string[]
  /** The dial's prose register. */
  voice: string
}

export const entityBiography: PromptTemplate<BiographyArgs, BiographyOut> = {
  id: 'entity-biography',
  version: '1.1.0',
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'BiographyOut',
  schema: BiographyOut,
  maxTokens: 3000,
  system: ({ voice }) => expanderSystem(voice),
  prompt: ({ podStatement, entity, stateLine, ledgerLines, relatedEvents }) =>
    `Divergence: ${podStatement}

Subject: ${entity.name} (${entity.type}). ${entity.description}

Current state on this branch: ${stateLine}

The ledger (every recorded change, in order):
${ledgerLines.length ? ledgerLines.map((s) => `- ${s}`).join('\n') : '- (no changes recorded yet)'}

Events it appears in:
${relatedEvents.length ? relatedEvents.map((s) => `- ${s}`).join('\n') : '- (none)'}

Write the biography as it would be written from inside this timeline: 2–4 paragraphs, consistent with every ledger line above (the critic will hold you to them). For a person, a life shaped by the changed world; for a nation, institution, technology, or movement, its career. End on how things stand now, not on destiny.`,
  seedKey: ({ entity, ledgerLines }) => `${entity.name}|${ledgerLines.length}`,
}
