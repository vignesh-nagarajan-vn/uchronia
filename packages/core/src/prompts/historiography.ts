import { InterpretationsOut, SchoolsOut } from '@uchronia/schemas'
import { HUMAN_VOICE, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/**
 * In-world historiography (v2/M20): the argument a history has about itself.
 * The schools are derived once per branch; interpretations are glossed on
 * demand, all schools in one call, because their disagreement is the point
 * and they are cheaper to write against each other than in isolation.
 */

export interface SchoolsArgs {
  podStatement: string
  stateSummary: string
  /** A few defining events, so the schools have something to have formed around. */
  majorEvents: Array<{ dateLabel: string; title: string; summary: string }>
  region: string
}

export const historiographySchools: PromptTemplate<SchoolsArgs, SchoolsOut> = {
  id: 'historiography-schools',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'SchoolsOut',
  schema: SchoolsOut,
  maxTokens: 2000,
  system: () =>
    `You name the rival schools of historians that grew up INSIDE a counterfactual world to argue about its own past. They are scholars of that world: they have never heard of ours, and they are not aware of being invented.

Two or three schools, and they must genuinely disagree, not merely emphasize. A real school is defined by what it thinks history is driven by, and therefore by what it is systematically bad at seeing. Give each one a seat (a city, an institution, a journal) that its own world would supply, and a blind spot its rivals actually name.

Avoid the obvious binary of great men against material forces unless this particular history really did produce it. A world's arguments come out of its own wounds: what it lost, what it got away with, what it cannot agree happened.

${HUMAN_VOICE}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, stateSummary, majorEvents, region }) =>
    `The divergence this world descends from: ${podStatement}
Its principal theatre: ${region}.

World-state as the historians inherit it:
${stateSummary}

Events they argue about:
${majorEvents.map((e) => `- ${e.dateLabel}: ${e.title}. ${e.summary}`).join('\n')}

Name the schools.`,
  seedKey: ({ podStatement, majorEvents }) =>
    `schools|${podStatement.slice(0, 40)}|${majorEvents.length}`,
}

export interface InterpretationsArgs {
  podStatement: string
  event: { dateLabel: string; title: string; summary: string; detail: string | null }
  stateSummary: string
  schools: Array<{ name: string; stance: string; blindSpot: string }>
}

export const eventInterpretation: PromptTemplate<InterpretationsArgs, InterpretationsOut> = {
  id: 'event-interpretation',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'InterpretationsOut',
  schema: InterpretationsOut,
  maxTokens: 2500,
  system: () =>
    `You write how each of a world's rival historical schools reads one event from its own past. Each gloss is in that school's voice, arguing its own case, and is two to four sentences.

The schools must actually disagree about this event, not just describe it in different vocabularies. A good set of glosses makes the reader see three different events. Let each school's blind spot show: the reading it cannot give is as revealing as the one it can.

None of them knows our history, and none of them is right.

${HUMAN_VOICE}

${SENSITIVE_HISTORY_STANCE}`,
  prompt: ({ podStatement, event, stateSummary, schools }) =>
    `The divergence this world descends from: ${podStatement}

The event under argument (${event.dateLabel}): ${event.title}
${event.detail ?? event.summary}

World-state around it:
${stateSummary}

The schools, in the order your glosses must follow:
${schools.map((s) => `- ${s.name}: holds that ${s.stance}. Its rivals say it cannot see ${s.blindSpot}.`).join('\n')}

Write one gloss per school, naming each school exactly as given.`,
  seedKey: ({ event, schools }) => `interp|${event.title}|${schools.map((s) => s.name).join(',')}`,
}
