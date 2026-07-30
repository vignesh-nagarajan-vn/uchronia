import {
  ClassifiedOut,
  EncyclopediaOut,
  LetterOut,
  NewspaperOut,
  ObituaryOut,
  PosterOut,
  RadioOut,
  TelegramOut,
} from '@uchronia/schemas'
import { HUMAN_VOICE, SENSITIVE_HISTORY_STANCE } from './fragments.js'
import type { PromptTemplate } from './types.js'

/**
 * F8 - diegetic artifacts: primary sources produced from INSIDE the timeline.
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
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
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
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
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
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
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
  changelog: ['1.0.0 - initial template', '1.1.0 - human voice mandate; dial register threaded in'],
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

export const artifactTelegram: PromptTemplate<ArtifactArgs, TelegramOut> = {
  id: 'artifact-telegram',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'TelegramOut',
  schema: TelegramOut,
  maxTokens: 1200,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'telegram (or its era-appropriate equivalent: despatch, semaphore signal, courier note)',
      'A telegram is charged by the word, so every word has been paid for. Clauses, not sentences: no articles the sender could drop, no adjective that is not load-bearing, no courtesy that costs more than it buys. Each line is one clause; the renderer punctuates them. The sender is reporting or ordering, never reflecting. If the era predates the wire, produce the fastest despatch it did have, and keep the same parsimony.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this wire: ${podStatement}

The matter being signalled, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state:
${stateSummary}

Produce the telegram: the office that filed it, who sent it to whom, when, and the clauses themselves.`,
  seedKey: ({ event }) => `wire|${event.title}|${event.year}`,
}

export const artifactRadio: PromptTemplate<ArtifactArgs, RadioOut> = {
  id: 'artifact-radio',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'RadioOut',
  schema: RadioOut,
  maxTokens: 3000,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'broadcast transcript (or its era-appropriate equivalent: a crier\u2019s round, a pulpit reading, a public address taken down by a clerk)',
      'This is a transcript, not a script: it was taken down while it happened, so it carries what a written version would have removed. A speaker who loses the thread. A phrase repeated because the line was bad. A silence somebody had to write down. Put transmission faults, interruptions, and the monitor\u2019s own notes in the annotations. Speakers are named as the monitor knew them, which is sometimes only by role.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this broadcast: ${podStatement}

What is being broadcast, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state (the listeners live inside these facts):
${stateSummary}

Produce the transcript.`,
  seedKey: ({ event }) => `radio|${event.title}|${event.year}`,
}

export const artifactObituary: PromptTemplate<ArtifactArgs, ObituaryOut> = {
  id: 'artifact-obituary',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'ObituaryOut',
  schema: ObituaryOut,
  maxTokens: 2500,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'death notice',
      'An obituary is always partly an argument about a life, and the argument is made by what it chooses to mention. It is written by someone with a position: a paper that admired the subject, or resented them, or is being careful. Record the career in the order that position implies. Name what the subject was blamed for as well as credited with. The dead do not become admirable by dying, and the notice should not pretend otherwise.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this notice: ${podStatement}

The death, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state:
${stateSummary}

Produce the notice. If the event is not itself a death, write the notice for whoever in it most plausibly did not outlive it, and say so in the first line.`,
  seedKey: ({ event }) => `obit|${event.title}|${event.year}`,
}

export const artifactClassified: PromptTemplate<ArtifactArgs, ClassifiedOut> = {
  id: 'artifact-classified',
  version: '1.0.0',
  changelog: ['1.0.0 - initial template (v2/M20)'],
  role: 'generation',
  schemaName: 'ClassifiedOut',
  schema: ClassifiedOut,
  maxTokens: 2500,
  system: ({ voice }) =>
    ARTIFACT_SYSTEM(
      'classified page',
      'The classified page is the most honest document a society produces, because nobody writing it is trying to be read by posterity. It shows what people are short of, what they are selling because they must, who is looking for whom, and what the going rate is. Two to five sections with era-appropriate headings. Every notice is somebody\u2019s actual problem, priced. No notice explains the world; together they give it away.',
      voice,
    ),
  prompt: ({ podStatement, event, stateSummary, region, distanceYears }) =>
    `The timeline diverged ${distanceYears} years before this page: ${podStatement}

What has just happened, "${event.title}" (${event.dateLabel}, ${region}):
${event.detail ?? event.summary}

World-state (these are the conditions the advertisers are living in):
${stateSummary}

Produce the classified page. The event should be legible in what people are advertising for and about, and never mentioned outright.`,
  seedKey: ({ event }) => `ads|${event.title}|${event.year}`,
}
