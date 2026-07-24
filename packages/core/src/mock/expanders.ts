import type { BiographyOut, ExpandOut } from '@uchronia/schemas'
import type { BiographyArgs, EraDeepDiveArgs, EventExpandArgs } from '../prompts/expanders.js'
import type { Rng } from '../rng.js'

const TEXTURES = [
  'The registers record it drily; the letters that survive do not.',
  'Contemporaries disagreed about what had happened well before they disagreed about what it meant.',
  'As usual, the porters and clerks knew first, and were consulted last.',
  'The official account was written within the month; the honest one took a generation.',
]

/** Deterministic expanded narrative built strictly from the given context. */
export function mockEventExpand(rawArgs: unknown, rng: Rng): ExpandOut {
  const { event, causeSummaries, effectSummaries, stateSummary } = rawArgs as EventExpandArgs
  const stateFact = stateSummary.split('\n')[0]?.replace(/^- /, '') ?? 'the state of things'
  const texture = rng.pick(TEXTURES)

  const p1 = `${event.summary} That is the ledger's version. In ${event.dateLabel}, seen from the street and the counting-house, it arrived as a change in queues, prices, and who was suddenly worth knowing.`
  const p2 =
    causeSummaries.length > 0
      ? `Its causes were on the record for anyone who cared to read them: ${causeSummaries[0]?.toLowerCase().replace(/\.$/, '')}. The connection was visible at the time, argued about but visible. ${texture}`
      : `No single cause is recorded, which contemporaries found harder to live with than a villain would have been. ${texture}`
  const p3 =
    effectSummaries.length > 0
      ? `What followed can be traced forward through the ledger: ${effectSummaries[0]?.toLowerCase().replace(/\.$/, '')}. At the time, though, the persistent fact was simpler. ${stateFact} And everything else was adjustment to it.`
      : `Nothing in the record yet points forward from here; the persistent fact was simply that ${stateFact.toLowerCase()}, and the adjustment to it had begun.`

  return { detail: `${p1}\n\n${p2}\n\n${p3}` }
}

export function mockEraDeepDive(rawArgs: unknown, rng: Rng): ExpandOut {
  const { era, pressureLines, eventLines } = rawArgs as EraDeepDiveArgs
  const texture = rng.pick(TEXTURES)
  const firstPressure = pressureLines[0]?.split(':')[0] ?? 'the ordinary strains of a changed world'
  const opening = `${era.summary} The span from ${era.startYear} to ${era.endYear} reads, in retrospect, as one argument conducted in many registers: what would ${firstPressure.toLowerCase()} be allowed to cost, and who would pay it.`
  const middle = `The record answers through its events. ${eventLines
    .slice(0, 3)
    .map((l) => l.split(' | ')[0])
    .join(
      '; ',
    )}. Each was a partial discharge of the same accumulated pressure, none a settlement. ${texture}`
  const closing = `By ${era.endYear} the question had not been answered so much as re-priced. What the era settled, it settled in habits and ledgers rather than treaties; what it left loaded, the next era would inherit with interest.`
  return { detail: `${opening}\n\n${middle}\n\n${closing}` }
}

export function mockBiography(rawArgs: unknown, rng: Rng): BiographyOut {
  const { entity, stateLine, ledgerLines, relatedEvents } = rawArgs as BiographyArgs
  const texture = rng.pick(TEXTURES)
  const opening = `${entity.name}. ${entity.description} In this history its career can be read line by line, because the ledger kept score.`
  const middle =
    ledgerLines.length > 0
      ? `The record runs: ${ledgerLines
          .slice(0, 4)
          .map((l) => l.replace(/^- /, ''))
          .join(' Then, ')} ${texture}`
      : `The record is thin: introduced, noted, and thereafter present mostly as context in other entries. ${texture}`
  const closing =
    `As matters stand: ${stateLine} ` +
    (relatedEvents.length > 1
      ? `Its name appears in ${relatedEvents.length} entries of this chronicle, which is its own kind of verdict.`
      : `The chronicle will have more to say; histories usually do.`)
  return { biography: `${opening}\n\n${middle}\n\n${closing}` }
}
