import { EncyclopediaOut, LetterOut, NewspaperOut, PosterOut } from '@uchronia/schemas'
import { HUMAN_VOICE, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/**
 * F8 — diegetic artifacts: primary sources produced from INSIDE the timeline.
 * The writer is a person of that world; they know nothing of our history and
 * never wink at it. Anachronism in voice is as much a failure as in fact.
 */
export interface ArtifactArgs {
  podStatement: string
  event: { title: string; summary: string; dateLabel: string; year: number; detail: string | null }
  stateSummary: string
  region: string
  distanceYears: number
  /** The dial's prose register. */
  voice: string
}

const ARTIFACT_SYSTEM = (
  kind: string,
  extra: string,
  voice: string,
) => `You forge a period ${kind} from inside a counterfactual timeline, a diegetic primary source. The writer belongs to that world: their idioms, assumptions, prices, and grievances are of their own time and place. They do not know our history and never address the reader across it.

${extra}

Stay strictly consistent with the event and world-state provided. Texture comes from the mundane: prices, names, weather, complaints.

${voice}

${HUMAN_VOICE}

${SENSITIVE_HISTORY_STANCE}`

export const artifactNewspaper: PromptTemplate<ArtifactArgs, NewspaperOut> = {
  id: 'artifact-newspaper',
  version: '1.1.0',
  changelog: ['1.0.0 — initial template', '1.1.0 — human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'NewspaperOut',
  schema: NewspaperOut,
  maxTokens: 3500,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'newspaper front page (or its era-appropriate equivalent: gazette, acta, broadsheet, court circular)',
      'Invent a masthead a paper of that place and era would actually carry. Column one reports the event; further columns carry adjacent stories that only make sense in this world. Close with 2–4 small notices or advertisements, the truest window into daily life.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this page: ${podStatement}

The event being reported, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state (the paper's readers live inside these facts):
${stateSummary}

Produce the front page.`,
  seedKey: ({ event }) => `news|${event.title}|${event.year}`,
}

export const artifactLetter: PromptTemplate<ArtifactArgs, LetterOut> = {
  id: 'artifact-letter',
  version: '1.1.0',
  changelog: ['1.0.0 — initial template', '1.1.0 — human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'LetterOut',
  schema: LetterOut,
  maxTokens: 3000,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'personal letter',
      'The writer is a minor participant or close observer (a factor, a clerk, a cousin in the trade) writing to someone who needs the news for practical reasons. Let the event arrive slantwise, tangled in family matters, money, and requests. Period-appropriate salutation and closing.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this letter: ${podStatement}

The event the letter touches, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state:
${stateSummary}

Write the letter.`,
  seedKey: ({ event }) => `letter|${event.title}|${event.year}`,
}

export const artifactEncyclopedia: PromptTemplate<ArtifactArgs, EncyclopediaOut> = {
  id: 'artifact-encyclopedia',
  version: '1.1.0',
  changelog: ['1.0.0 — initial template', '1.1.0 — human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'EncyclopediaOut',
  schema: EncyclopediaOut,
  maxTokens: 3000,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'encyclopedia entry',
      'The encyclopedia is an in-world reference work compiled decades after the event, with a name, an edition note, and the quiet biases of its compilers. The entry treats the event as settled history: footnoted, slightly opinionated, occasionally correcting "popular error". See-also entries reference other things of that world.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this event: ${podStatement}

The entry's subject, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state around it:
${stateSummary}

Write the entry.`,
  seedKey: ({ event }) => `encyc|${event.title}|${event.year}`,
}

export const artifactPoster: PromptTemplate<ArtifactArgs, PosterOut> = {
  id: 'artifact-poster',
  version: '1.1.0',
  changelog: ['1.0.0 — initial template', '1.1.0 — human voice mandate; dial register threaded in'],
  role: 'generation',
  schemaName: 'PosterOut',
  schema: PosterOut,
  maxTokens: 2000,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'public poster (proclamation, recruitment bill, advertisement, or propaganda sheet, whichever the event calls for)',
      'Posters want something from the reader: money, obedience, attendance, belief. Name the issuing authority. Short lines, declarative voice, one slogan if the era would carry one.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this poster: ${podStatement}

The occasion, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state:
${stateSummary}

Produce the poster.`,
  seedKey: ({ event }) => `poster|${event.title}|${event.year}`,
}
