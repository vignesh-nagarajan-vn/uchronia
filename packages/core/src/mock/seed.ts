import type { DraftEvent, EraBatchOut } from '@uchronia/schemas'
import type { SeedArgs } from '../prompts/seed-consequences.js'
import type { Rng } from '../rng.js'
import { MECHANISM_LENS, pickPerson, regionFlavor } from './flavor.js'

const ERA_TITLES = [
  'The First Ripples',
  'The Held Breath',
  'Two Years of Aftermath',
  'The News Travels',
]

/** Variant tails for the divergence event, so parallel mock worlds read differently. */
const LANDING_TAILS = [
  (city: string) =>
    `In ${city}, the first weeks pass in wary normality: couriers carry the news outward, and those who grasp what has changed are mostly those paid to worry about it.`,
  (city: string) =>
    `${city} takes the news the way ports take weather — schedules shift before opinions do, and the harbormaster knows before the council does.`,
  (city: string) =>
    `In ${city} the criers say little and the letter-writers say too much; between them, a usable account of the new situation takes a season to form.`,
]

const RIVAL_OPENINGS = [
  (rival: string) =>
    `Reports reaching ${rival} force a quiet revision of plans laid under the old assumptions. Envoys are reassigned, an inventory is taken, and a policy that had seemed settled is reopened — without any public admission that anything has changed.`,
  (rival: string) =>
    `In the chanceries of ${rival}, the first response is to ask for better copies of the dispatches. The second is to move money. Only the third, months later, is anything resembling a policy.`,
  (rival: string) =>
    `${rival} greets the news with practiced calm and private arithmetic: garrison rosters are recounted, grain contracts re-read, and an heirloom map quietly redrawn.`,
]

const ERA_SUMMARIES = [
  'The divergence lands and the world absorbs it: records are taken, prices move, and the neighbors begin to recalculate. Nothing irreversible has happened yet — except the thing itself.',
  'Two years of consequences arrive in the order consequences always do: first prices, then postures, then paperwork. The great structures hold; their assumptions do not.',
  'The world does not change so much as re-file itself: what was certain becomes pending, and clerks inherit the first draft of the new history.',
]

const DIVERGENCE_TITLES: Record<string, string[]> = {
  knowledge: ['The archive stands', 'The copyists keep working', 'What was not lost'],
  disease: ['The wards stay quiet', 'A sickness that never spreads', 'The spared season'],
  politics: ['The succession holds', 'A different order signed', 'The wall that held'],
  technology: [
    'The workshop does not close',
    'An engine out of season',
    'The fleet keeps its yards',
  ],
  economics: ['The exchange stays open', 'A ledger rewritten', 'The route not severed'],
  environment: ['The sky spares the harvest', 'A kinder season', 'The flood that never came'],
  culture: ['A congregation undivided', 'The canon gains a book', 'The custom survives'],
}

/**
 * Deterministic seed-consequences for mock mode: four disciplined events in
 * years 0–2 that found the entity roster (nation, rival, person, institution),
 * mutate state on every event, chain causes, and spread lenses per P6.
 */
export function mockSeedConsequences(rawArgs: unknown, rng: Rng): EraBatchOut {
  const { pod } = rawArgs as SeedArgs
  const flavor = regionFlavor(pod.region, pod.year)
  const person = pickPerson(flavor, rng)
  const mechanismLens = MECHANISM_LENS[pod.mechanism]
  const y = pod.year

  const label = (year: number, phase: number): string =>
    year < 0
      ? `${Math.abs(year)} BC`
      : `${['Early', 'Later that year,', 'Spring', 'Autumn'][phase % 4]} ${year}`

  const d1: DraftEvent = {
    ref: 'd1',
    year: y,
    dateLabel: pod.dateLabel,
    title: rng.pick(
      DIVERGENCE_TITLES[pod.mechanism] ?? DIVERGENCE_TITLES.politics ?? ['The divergence lands'],
    ),
    summary: `${pod.statement} ${rng.pick(LANDING_TAILS)(flavor.city)}`,
    lenses: [mechanismLens],
    entitySlugs: [flavor.nationSlug, person.slug],
    newEntities: [
      {
        slug: flavor.nationSlug,
        name: flavor.nation.charAt(0).toUpperCase() + flavor.nation.slice(1),
        type: 'nation',
        description: `The power most immediately shaped by the divergence, seated at ${flavor.city}.`,
        initialState: [
          { key: 'seat', value: flavor.city },
          { key: 'standing', value: 'steady but watched' },
          { key: 'treasury', value: 'strained' },
        ],
      },
      {
        slug: person.slug,
        name: person.name,
        type: 'person',
        description: `A figure of ${flavor.city} whose fortunes ride on the changed course of events.`,
        initialState: [
          { key: 'position', value: 'well-placed observer' },
          { key: 'reputation', value: 'rising' },
        ],
      },
    ],
    deltas: [
      {
        entitySlug: flavor.nationSlug,
        patch: [
          { key: 'divergenceAbsorbed', value: true },
          { key: 'mood', value: 'wary relief' },
        ],
        note: 'The immediate shock is absorbed; the accounting begins.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.86,
      rationale:
        'Direct restatement of the divergence itself; the least contingent claim in the timeline.',
    },
    wildcard: false,
  }

  const d2: DraftEvent = {
    ref: 'd2',
    year: y,
    dateLabel: label(y, 1),
    title: `${flavor.institution.charAt(0).toUpperCase() + flavor.institution.slice(1)} convenes over the changed course`,
    summary: `${flavor.institution.charAt(0).toUpperCase() + flavor.institution.slice(1)} meets in extraordinary session. ${person.name} argues that the moment must be committed to record before rumor rewrites it; a survey of holdings, obligations, and precedents is ordered.`,
    lenses: ['political', 'cultural'],
    entitySlugs: [flavor.institutionSlug, person.slug],
    newEntities: [
      {
        slug: flavor.institutionSlug,
        name: flavor.institution.charAt(0).toUpperCase() + flavor.institution.slice(1),
        type: 'institution',
        description: `The body in ${flavor.city} that turns events into records and records into policy.`,
        initialState: [
          { key: 'agenda', value: 'survey the changed circumstance' },
          { key: 'influence', value: 'procedural but real' },
        ],
      },
    ],
    deltas: [
      {
        entitySlug: flavor.institutionSlug,
        patch: [{ key: 'session', value: 'extraordinary' }],
        note: 'The institution claims the divergence as its business.',
      },
      {
        entitySlug: person.slug,
        patch: [{ key: 'position', value: 'convenor of the survey' }],
        note: 'Responsibility, and visibility, attach to the one who asked for the record.',
      },
    ],
    causes: [{ ref: 'd1', kind: 'causes', strength: 0.85 }],
    plausibility: {
      score: 0.74,
      rationale:
        'Institutions reliably respond to discontinuity with procedure; the specific convenor is the contingent part.',
    },
    wildcard: false,
  }

  const d3: DraftEvent = {
    ref: 'd3',
    year: y + 1,
    dateLabel: label(y + 1, 2),
    title: `${flavor.commodity.charAt(0).toUpperCase() + flavor.commodity.slice(1)} prices shift in the ${flavor.city} markets`,
    summary: `The first measurable consequence arrives where it always does: in prices. ${flavor.commodity.charAt(0).toUpperCase() + flavor.commodity.slice(1)} moves against last season's rate in ${flavor.city}, and porters, brokers, and household stewards adjust before any council does.`,
    lenses: ['economic', 'daily-life'],
    entitySlugs: [flavor.nationSlug],
    newEntities: [],
    deltas: [
      {
        entitySlug: flavor.nationSlug,
        patch: [
          { key: 'marketSignal', value: `${flavor.commodity} repriced` },
          { key: 'treasury', value: 'strained but liquid' },
        ],
        note: 'The exchequer notices what the market already knew.',
      },
    ],
    causes: [{ ref: 'd1', kind: 'causes', strength: 0.7 }],
    plausibility: {
      score: 0.78,
      rationale:
        'Price adjustment is the most reliable early transmission channel of any structural change.',
    },
    wildcard: false,
  }

  const d4: DraftEvent = {
    ref: 'd4',
    year: y + 2,
    dateLabel: label(y + 2, 3),
    title: `${flavor.rival.charAt(0).toUpperCase() + flavor.rival.slice(1)} recalculates`,
    summary: rng.pick(RIVAL_OPENINGS)(flavor.rival),
    lenses: ['political'],
    entitySlugs: [flavor.rivalSlug],
    newEntities: [
      {
        slug: flavor.rivalSlug,
        name: flavor.rival.charAt(0).toUpperCase() + flavor.rival.slice(1),
        type: 'nation',
        description: 'The neighboring power whose plans assumed the old course of history.',
        initialState: [
          { key: 'posture', value: 'recalculating' },
          { key: 'intelligence', value: 'secondhand and late' },
        ],
      },
    ],
    deltas: [
      {
        entitySlug: flavor.rivalSlug,
        patch: [{ key: 'policy', value: 'reopened' }],
        note: 'The rival’s settled policy quietly goes back to committee.',
      },
    ],
    causes: [
      { ref: 'd2', kind: 'enables', strength: 0.5 },
      { ref: 'd1', kind: 'causes', strength: 0.65 },
    ],
    plausibility: {
      score: 0.68,
      rationale:
        'Neighbors always reprice risk after a discontinuity; the two-year lag matches the speed of credible intelligence.',
    },
    wildcard: false,
  }

  return {
    title: rng.pick(ERA_TITLES),
    summary: rng.pick(ERA_SUMMARIES),
    events: [d1, d2, d3, d4],
  }
}
