import type {
  ClassifiedOut,
  EncyclopediaOut,
  LetterOut,
  NewspaperOut,
  ObituaryOut,
  PosterOut,
  RadioOut,
  TelegramOut,
} from '@uchronia/schemas'
import type { ArtifactArgs } from '../prompts/artifacts.js'
import type { Rng } from '../rng.js'
import { eraBucket, pickPerson, regionFlavor } from './flavor.js'

const MASTHEADS: Record<ReturnType<typeof eraBucket>, (city: string) => string> = {
  ancient: (city) => `ACTA OF ${city.toUpperCase()}`,
  medieval: (city) => `The ${city} Chronicle of Common Report`,
  'early-modern': (city) => `The ${city} Courant`,
  modern: (city) => `The ${city} Intelligencer`,
  twentieth: (city) => `The ${city} Evening Dispatch`,
}

const NOTICES: Record<ReturnType<typeof eraBucket>, string[]> = {
  ancient: [
    'Grain measures certified at the temple scales; short measures answer to the eparch.',
    'A copyist, neat hand, seeks engagement by the season. Ask at the second colonnade.',
    'Lost: one seal-ring, lion device. Reward in silver, no questions.',
  ],
  medieval: [
    'Masses will be said for the souls of the drowned of the grain fleet; the guild bears the cost.',
    'An honest journeyman seeks a master in the binding trade. Enquire at the sign of the Ox.',
    'The bridge toll rises one penny at Michaelmas by order of the council.',
  ],
  'early-modern': [
    'New-printed: a table of exchange for all coins current, corrected to this year. Two shillings.',
    'A house to let by the water stairs, sound roof, garden of pot-herbs. Treat with the widow Aldersey.',
    'Runaway apprentice, answers to Jem; whoever returns him claims a crown and no thanks.',
  ],
  modern: [
    'Steam packet departs Tuesdays and Fridays, weather permitting. Berths from twelve shillings.',
    'Wanted: clerks with a fair hand and no opinions. Apply in writing to the registry.',
    'Dr. Malloy’s Universal Tonic, now with less mercury. Ask your chemist.',
  ],
  twentieth: [
    'Ration books for the quarter are ready at the district office; bring the old cover.',
    'Wireless sets repaired while you wait; valves in short supply, patience requested.',
    'Lost near the tram depot: one identity card, initials R.V. Honest finder rewarded.',
  ],
}

export function mockArtifactNewspaper(rawArgs: unknown, _rng: Rng): NewspaperOut {
  const { event, region, stateSummary } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const bucket = eraBucket(event.year)
  const masthead = MASTHEADS[bucket](flavor.city)
  const stateFact = stateSummary.split('\n')[1]?.replace(/^- /, '') ?? ''

  return {
    title: `${masthead}, ${event.dateLabel}`,
    body: {
      kind: 'newspaper',
      masthead,
      dateline: `${flavor.city}, ${event.dateLabel}; price: what the crier asks`,
      headline: event.title.toUpperCase(),
      subhead: 'From our own correspondents; the particulars as far as they can be known',
      columns: [
        {
          heading: null,
          paragraphs: [
            event.summary,
            `Those closest to the affair counsel patience; those furthest from it, as usual, counsel everything else. The ${flavor.institution.replace(/^the /i, '')} is said to be preparing an accounting, which is what it is always said to be preparing.`,
          ],
        },
        {
          heading: `The view from the ${flavor.commodity} exchange`,
          paragraphs: [
            `Prices answered before opinions did. Dealers in ${flavor.commodity} report the season's contracts rewritten twice in a fortnight, and the porters, who always know first, have raised their rates.`,
            stateFact
              ? `It is meanwhile reported that ${stateFact.split(':')[1]?.trim() ?? 'the accounts stand much as before'}.`
              : 'The accounts otherwise stand much as before.',
          ],
        },
      ],
      notices: NOTICES[bucket].slice(0, 3),
    },
  }
}

export function mockArtifactLetter(rawArgs: unknown, rng: Rng): LetterOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const writer = pickPerson(flavor, rng)

  return {
    title: `Letter of ${writer.name} on ${event.title.toLowerCase()}`,
    body: {
      kind: 'letter',
      from: writer.name,
      to: 'my brother in the trade',
      place: flavor.city,
      dateLabel: event.dateLabel,
      salutation: 'Brother,',
      paragraphs: [
        `You will have heard some version of it by now, so let me give you the true one before rumor improves it further. ${event.summary}`,
        `What it means for us: the ${flavor.commodity} contracts must be re-sworn, and I would not extend credit past the season until we see how the ${flavor.institution.replace(/^the /i, '')} settles. Aunt Zoe asks after your health and whether the northern road is safe; I have told her yes to the first and lied about the second.`,
        `Send word by the first reliable carrier. And send the account-book. The real one.`,
      ],
      closing: 'Your brother, in haste,',
      signature: writer.name.split(' ')[0] ?? writer.name,
      postscript:
        'P.S. The price of candles has doubled. Draw your own conclusions about how late the council is sitting.',
    },
  }
}

export function mockArtifactEncyclopedia(rawArgs: unknown, rng: Rng): EncyclopediaOut {
  const { event, region, distanceYears, podStatement } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const editions = ['Second', 'Third', 'Fourth', 'Fifth']
  const edition = rng.pick(editions)

  return {
    title: `Encyclopedia entry: ${event.title}`,
    body: {
      kind: 'encyclopedia',
      encyclopediaTitle: `The Universal Chronicle, Compiled at ${flavor.city}`,
      editionNote: `${edition} edition, revised and corrected by the editors`,
      headword: event.title.replace(/^(The|A|An)\s+/i, ''),
      entryParagraphs: [
        `${event.summary} The dating follows the ${flavor.city} registers; provincial chronicles differ by as much as a season, and the popular account differs in everything else.`,
        `Later writers, with the advantage of ${Math.max(20, Math.round(distanceYears / 2))} years' distance, treat the affair as an early consequence of the great turn of events (see THE DIVERGENCE, whereby ${podStatement.toLowerCase().replace(/\.$/, '')}). The editors caution against reading inevitability backward into it: to those present it was weather, prices, and personalities.`,
        `The popular error that the matter was settled in a single day is corrected in the appendix of retractions.`,
      ],
      seeAlso: [
        'THE DIVERGENCE',
        flavor.institution.replace(/^the /i, '').toUpperCase(),
        `${flavor.commodity.toUpperCase()}, TRADE IN`,
      ],
    },
  }
}

export function mockArtifactPoster(rawArgs: unknown, rng: Rng): PosterOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const slogans = [
    'THE LEDGER REMEMBERS.',
    'ORDER, BREAD, AND HONEST WEIGHTS.',
    'WHAT WE KEEP, WE KEEP TOGETHER.',
  ]

  return {
    title: `Public bill: ${event.title}`,
    body: {
      kind: 'poster',
      headline: event.title.toUpperCase(),
      subheadline: `Let it be known in every quarter of ${flavor.city}`,
      lines: [
        'By order and with the knowledge of the authorities:',
        `All persons concerned in the ${flavor.commodity} trade shall present their books for inspection.`,
        'Honest dealers have nothing to fear and less to gain; the other kind know who they are.',
        'Notices torn down will be reposted at the offender’s cost.',
      ],
      issuer: flavor.institution.charAt(0).toUpperCase() + flavor.institution.slice(1),
      slogan: rng.pick(slogans),
    },
  }
}

/**
 * The forge's second shelf, demo-side (v2/M20). Each keeps the register its
 * form is stuck with, because that is the whole point of the form: a wire
 * cannot afford adjectives, a transcript keeps the faults a script would
 * remove, a notice argues about a life, and a classified page gives away
 * what a society is short of.
 */

export function mockArtifactTelegram(rawArgs: unknown, rng: Rng): TelegramOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const bucket = eraBucket(event.year)
  const office =
    bucket === 'ancient' || bucket === 'medieval'
      ? `COURIER STATION ${flavor.city.toUpperCase()}`
      : `${flavor.city.toUpperCase()} CENTRAL OFFICE`
  return {
    title: `Wire from ${flavor.city}, ${event.dateLabel}`,
    body: {
      kind: 'telegram',
      office,
      from: pickPerson(flavor, rng).name,
      to: 'THE OFFICE OF THE SECRETARY',
      filedAt: `${event.dateLabel}, ${rng.int(4, 11)}h`,
      words: [
        `MATTER CONFIRMED THIS DAY ${event.dateLabel.toUpperCase()}`,
        `SUBSTANCE AS REPORTED ${event.title.toUpperCase()}`,
        'LOCAL PARTIES ALREADY MOVING',
        'REQUIRE INSTRUCTION BEFORE COMMITTING FUNDS',
        'DELAY COSTS MORE THAN ERROR',
      ],
      endorsement: rng.next() < 0.5 ? 'Received and copied to the second desk.' : null,
    },
  }
}

export function mockArtifactRadio(rawArgs: unknown, rng: Rng): RadioOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const announcer = pickPerson(flavor, rng).name
  return {
    title: `Transcript: ${flavor.city}, ${event.dateLabel}`,
    body: {
      kind: 'radio',
      station: `${flavor.city} Public Transmission`,
      programme: 'The evening report',
      airedAt: event.dateLabel,
      lines: [
        { speaker: announcer, text: `We begin with the matter everyone has been waiting on.` },
        {
          speaker: announcer,
          text: `${event.summary}`,
        },
        {
          speaker: 'A second voice, unidentified',
          text: 'That is not the wording we were given upstairs.',
        },
        {
          speaker: announcer,
          text: 'We will read it again as it came to us, and let the listener judge.',
        },
      ],
      annotations: [
        'Signal weak for some seconds here; the monitor has supplied what could be made out.',
        'A pause of eleven seconds. Nobody fills it.',
      ],
    },
  }
}

export function mockArtifactObituary(rawArgs: unknown, rng: Rng): ObituaryOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const subject = pickPerson(flavor, rng).name
  const age = rng.int(51, 79)
  return {
    title: `${subject}, an obituary`,
    body: {
      kind: 'obituary',
      publication: `The ${flavor.city} Register`,
      headline: `${subject}, who was in the room`,
      subject,
      lifespan: `${event.year - age}-${event.year}`,
      paragraphs: [
        `${subject} died this week, having outlived most of the arrangements they helped make.`,
        `Their part in ${event.title.toLowerCase()} is the one the notices will lead with, and it is fair that they should: the decision was theirs to make and they made it.`,
        `Those who worked under them describe a person who was exact about money and vague about consequences, and who did not much distinguish between being owed a thing and being right about it.`,
        `They are survived by the office they built, which will outlast the reasons for building it.`,
      ],
      epitaph: rng.next() < 0.6 ? 'The ledger balanced. The rest is argument.' : null,
    },
  }
}

export function mockArtifactClassified(rawArgs: unknown, _rng: Rng): ClassifiedOut {
  const { event, region } = rawArgs as ArtifactArgs
  const flavor = regionFlavor(region, event.year)
  const bucket = eraBucket(event.year)
  return {
    title: `Notices, ${flavor.city}, ${event.dateLabel}`,
    body: {
      kind: 'classified',
      publication: `The ${flavor.city} Register`,
      dateLabel: event.dateLabel,
      sections: [
        {
          heading: 'Wanted',
          notices: [
            'Steady hands for the season, paid weekly, no questions about the last place.',
            'Anyone with news of the northern consignment. The owner has stopped expecting it and now only wants to know.',
          ],
        },
        {
          heading: 'For sale or exchange',
          notices: [
            ...(NOTICES[bucket] ?? []).slice(0, 2),
            'Household effects of a family leaving the district. Everything must go by the week end; the reason is not your business.',
          ],
        },
        {
          heading: 'Personal',
          notices: [
            'To the party who knows what was said at the quay: it need not go further, and it will not, if matters are settled.',
          ],
        },
      ],
    },
  }
}
