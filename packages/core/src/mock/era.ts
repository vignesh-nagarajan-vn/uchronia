import {
  ANCHOR_REGIONS,
  type DraftEvent,
  type DraftIndexShift,
  type DraftNameDrift,
  type EraBatchOut,
  type Lens,
  type Pressure,
} from '@uchronia/schemas'
import type { EraGenerateArgs } from '../prompts/era-generate.js'
import type { Rng } from '../rng.js'

interface Roster {
  nation: { slug: string; name: string }
  rival: { slug: string; name: string }
  institution: { slug: string; name: string }
  person: { slug: string; name: string }
}

function pickRoster(entities: EraGenerateArgs['entityRoster']): Roster {
  const byType = (t: string, skip = 0) => entities.filter((e) => e.type === t)[skip]
  const fallback = entities[0] ?? { slug: 'the-realm', name: 'The Realm', type: 'nation' }
  return {
    nation: byType('nation') ?? fallback,
    rival: byType('nation', 1) ?? byType('institution') ?? fallback,
    institution: byType('institution') ?? fallback,
    person: byType('person') ?? fallback,
  }
}

const ERA_TITLES = [
  'The Settling Accounts',
  'A Widening Circle',
  'The Long Adjustment',
  'New Channels',
  'The Inheritance Divided',
  'What the Change Cost',
  'The Second Harvest',
  'Old Roads, New Traffic',
]

/** New actors introduced as history widens - one bank per era ordinal, no slug collisions. */
const NEW_ENTITY_BANKS: Record<
  number,
  {
    slug: string
    name: string
    type: 'technology' | 'movement' | 'person' | 'institution'
    description: string
    fact: { key: string; value: string }
  }
> = {
  1: {
    slug: 'the-improved-method',
    name: 'The Improved Method',
    type: 'technology',
    description:
      'A working technique, escaped from the shops that guarded it, now spreading by apprenticeship.',
    fact: { key: 'diffusion', value: 'apprentice to apprentice' },
  },
  3: {
    slug: 'the-plain-speech-circle',
    name: 'The Plain Speech Circle',
    type: 'movement',
    description:
      'A loose movement of clerks and preachers who want the new circumstances named honestly.',
    fact: { key: 'membership', value: 'clerks, preachers, a few merchants' },
  },
  4: {
    slug: 'the-younger-generation',
    name: 'The Second Generation',
    type: 'movement',
    description: 'Those born after the divergence, for whom the changed world is simply the world.',
    fact: { key: 'memory', value: 'none of the old course' },
  },
}

type Archetype = (args: {
  ref: string
  year: number
  yearLabel: string
  roster: Roster
  pressure: Pressure
  rng: Rng
}) => DraftEvent

const archetypes: Archetype[] = [
  // council / reform - political
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `${roster.nation.name} reorders its accounts under ${pressure.name.toLowerCase()}`,
    summary: `${pressure.description} The council answers with a reform that costs three offices their perquisites and creates two new registers.`,
    lenses: ['political'] as Lens[],
    entitySlugs: [roster.nation.slug, roster.institution.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.nation.slug,
        patch: [{ key: 'administration', value: `reformed under ${pressure.name.toLowerCase()}` }],
        note: 'Offices are consolidated; the registers survive their authors.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.72,
      rationale:
        'Administrative reform is the standard discharge of fiscal and legitimacy pressure.',
    },
    wildcard: false,
  }),
  // market / prices - economic + daily-life
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `The markets reprice around ${roster.nation.name.replace(/^The /, 'the ')}`,
    summary: `${pressure.description} Brokers adjust before any edict: contracts shorten, surety costs rise, and household stewards change what they store.`,
    lenses: ['economic', 'daily-life'] as Lens[],
    entitySlugs: [roster.nation.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.nation.slug,
        patch: [
          { key: 'creditTerms', value: 'shortened' },
          { key: 'householdStores', value: 'deepened' },
        ],
        note: 'The market hedges; kitchens follow.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.78,
      rationale:
        'Price adjustment is the most reliable transmission channel of structural pressure.',
    },
    wildcard: false,
  }),
  // technique diffusion - technological
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `A working technique crosses ${roster.rival.name.replace(/^The /, 'the ')}'s border`,
    summary: `What ${roster.institution.name.replace(/^The /, 'the ')} kept close now travels with journeymen. ${pressure.description}`,
    lenses: ['technological', 'economic'] as Lens[],
    entitySlugs: [roster.institution.slug, roster.rival.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.rival.slug,
        patch: [{ key: 'technique', value: 'acquired by hire' }],
        note: 'Knowledge proves cheaper to hire than to guard.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.66,
      rationale: 'Techniques diffuse along wage gradients; guarding them raises the wage.',
    },
    wildcard: false,
  }),
  // school / canon - cultural
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `${roster.institution.name} revises what the young are taught`,
    summary: `A new syllabus fixes the changed world into schoolroom fact. ${pressure.description} Children now learn as ordinary what their grandparents called impossible.`,
    lenses: ['cultural', 'daily-life'] as Lens[],
    entitySlugs: [roster.institution.slug, roster.person.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.institution.slug,
        patch: [{ key: 'curriculum', value: 'revised to the new circumstances' }],
        note: 'The syllabus quietly rewrites what counts as common knowledge.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.7,
      rationale: 'Institutions metabolize discontinuity into curriculum within a generation.',
    },
    wildcard: false,
  }),
  // frontier / rival - political
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `${roster.rival.name} tests the new balance`,
    summary: `${pressure.description} A probe at the margin (an envoy recalled, a toll raised, a garrison reinforced) measures how much the world has actually changed.`,
    lenses: ['political'] as Lens[],
    entitySlugs: [roster.rival.slug, roster.nation.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.rival.slug,
        patch: [{ key: 'posture', value: 'probing' }],
        note: 'The rival prices the new equilibrium in small provocations.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.69,
      rationale: 'Neighbors test any settlement whose guarantors look distracted.',
    },
    wildcard: false,
  }),
  // person / generation - daily-life
  ({ ref, year, yearLabel, roster, pressure }) => ({
    ref,
    year,
    dateLabel: yearLabel,
    title: `${roster.person.name} sets the fashion of the season`,
    summary: `Style declares allegiance: the cut of a coat, a turn of phrase, a way of dating letters "since the change". ${pressure.description}`,
    lenses: ['daily-life', 'cultural'] as Lens[],
    entitySlugs: [roster.person.slug],
    newEntities: [],
    deltas: [
      {
        entitySlug: roster.person.slug,
        patch: [{ key: 'influence', value: 'sets the season' }],
        note: 'Manners record the divergence more durably than treaties.',
      },
    ],
    causes: [],
    plausibility: {
      score: 0.74,
      rationale: 'Fashion metabolizes politics faster than institutions do.',
    },
    wildcard: false,
  }),
]

/**
 * Deterministic era generation for mock mode: batchSize events discharging the
 * given pressures through rotating archetypes (P6 lens spread built in),
 * demo-path specials at fixed ordinals (a fixable cliche at ordinal 1, a
 * dispute-kept implausibility at ordinal 2), wildcards per the dial budget.
 */
export function mockEraGenerate(rawArgs: unknown, rng: Rng): EraBatchOut {
  const args = rawArgs as EraGenerateArgs
  const roster = pickRoster(args.entityRoster)
  const span = args.span
  const width = Math.max(1, span.endYear - span.startYear)
  const count = Math.max(2, Math.min(10, args.batchSize))

  const priorRefs = [...args.recentEvents.matchAll(/^e(\d+)/gm)].map((m) => Number(m[1]))
  const lastPrior = priorRefs.length > 0 ? Math.max(...priorRefs) : null

  const events: DraftEvent[] = []
  for (let i = 0; i < count; i++) {
    const year = Math.min(
      span.endYear,
      span.startYear + Math.max(1, Math.round(((i + 0.5) * width) / count)),
    )
    const pressure = args.pressures[i % Math.max(1, args.pressures.length)] ?? {
      name: 'Quiet strain',
      kind: 'economic' as const,
      description: 'The ordinary frictions of a changed world.',
      intensity: 0.5,
    }
    const archetype = archetypes[(i + args.ordinal) % archetypes.length]
    if (!archetype) continue
    const draft = archetype({
      ref: `d${i + 1}`,
      year,
      yearLabel: year < 0 ? `${Math.abs(year)} BC` : String(year),
      roster,
      pressure,
      rng,
    })
    // Causal chaining: first event cites the recent past, the rest chain inward.
    draft.causes =
      i === 0
        ? lastPrior
          ? [{ ref: `e${lastPrior}`, kind: 'causes', strength: 0.6 }]
          : []
        : [
            {
              ref: `d${i}`,
              kind: rng.next() < 0.3 ? 'enables' : 'causes',
              strength: 0.5 + rng.next() * 0.3,
            },
          ]
    events.push(draft)
  }

  // A new actor enters at fixed ordinals (no slug collisions across eras).
  const newcomer = NEW_ENTITY_BANKS[args.ordinal]
  const host = events[Math.min(1, events.length - 1)]
  if (newcomer && host) {
    host.newEntities = [
      {
        slug: newcomer.slug,
        name: newcomer.name,
        type: newcomer.type,
        description: newcomer.description,
        initialState: [newcomer.fact],
      },
    ]
    host.entitySlugs = [...host.entitySlugs, newcomer.slug]
    host.deltas = [
      ...host.deltas,
      {
        entitySlug: newcomer.slug,
        patch: [{ key: 'standing', value: 'newly consequential' }],
        note: 'A new name starts appearing in the registers.',
      },
    ]
  }

  // A forked branch's first own era opens with its sub-divergence landing.
  if (args.subPodStatement && args.ordinal === 0 && events[0]) {
    const first = events[0]
    first.title = 'The second divergence lands'
    first.summary = `${args.subPodStatement} From here the branch keeps its own ledger: ${first.summary}`
    first.deltas = [
      ...first.deltas,
      {
        entitySlug: roster.nation.slug,
        patch: [{ key: 'subDivergence', value: args.subPodStatement.slice(0, 80) }],
        note: 'The branch records its own point of departure.',
      },
    ]
  }

  // Demo paths (deterministic): ordinal 1 carries a fixable cliche;
  // ordinal 2 carries a claim the critic will keep but dispute.
  if (args.ordinal === 1 && events[2]) {
    events[2].summary = `Suddenly the old arrangement gives way. ${events[2].summary}`
  }
  if (args.ordinal === 2 && events.length > 0) {
    const last = events[events.length - 1]
    if (last) {
      last.title = `${roster.person.name} attempts the grand reconciliation`
      last.summary = `Against every counsel, ${roster.person.name} stakes the season on reconciling parties whose interests the ledgers say cannot meet.`
      last.plausibility = {
        score: 0.3,
        rationale:
          'It would take personal force to overcome what the state of the world says is overdetermined.',
      }
    }
  }

  // Dial rule (b): the last wildcardBudget events are wildcards.
  for (let w = 0; w < Math.min(args.wildcardBudget, events.length - 1); w++) {
    const event = events[events.length - 1 - w]
    if (event && event.plausibility.score >= 0.35) {
      event.wildcard = true
      event.plausibility = {
        score: 0.5,
        rationale: `${event.plausibility.rationale} A chronicler would call this one surprising.`,
      }
    }
  }

  return {
    title: ERA_TITLES[(args.ordinal + rng.int(0, 2)) % ERA_TITLES.length] ?? 'The Years Between',
    summary: `Between ${span.startYear} and ${span.endYear}, the divergence stops being news and starts being structure: ${args.pressures[0]?.name.toLowerCase() ?? 'quiet strain'} sets the agenda, and the ${roster.nation.name.replace(/^The /, '')} adjusts.`,
    events,
    indexShifts: mockIndexShifts(args, rng),
    nameDrift: mockNameDrift(args, events, rng),
  }
}

/**
 * Demo-mode regional readings (v2/M18). The dials walk, they never jump: the
 * demo has to exercise the index-continuity rule without tripping it, so
 * every step stays inside the validator's bound.
 */
function mockIndexShifts(args: EraGenerateArgs, rng: Rng): DraftIndexShift[] {
  // Only the divergence's own theatre moves in demo mode; a canned engine has
  // no business asserting readings for regions it never mentions.
  const region = ANCHOR_REGIONS.find((r) => r === args.podRegion) ?? 'the wider world'
  const opening = parseIndexSummary(args.indexSummary ?? '', region)
  const strain = args.pressures[0]?.intensity ?? 0.5
  const step = (base: number, drift: number): number =>
    Math.max(0, Math.min(100, base + drift + rng.int(-2, 2)))
  return [
    {
      region,
      index: 'population',
      value: step(opening.population, strain > 0.7 ? -4 : 2),
      note:
        strain > 0.7
          ? 'The strain of the era is paid in households: levies, bad harvests, and the quiet migration that follows both.'
          : 'A settled generation: the parish rolls lengthen at the pace they always do when nothing catches fire.',
    },
    {
      region,
      index: 'economicVitality',
      value: step(opening.economicVitality, args.distanceYears > 40 ? 5 : 1),
      note:
        args.distanceYears > 40
          ? 'Far enough from the divergence for its second-order effects to reach the markets rather than the chronicles.'
          : 'The books balance about as they did before; the divergence has not yet reached the counting house.',
    },
  ]
}

/** Read the pre-rendered index summary back, so demo dials continue rather than reset. */
function parseIndexSummary(
  summary: string,
  region: string,
): { population: number; economicVitality: number } {
  const line = summary.split('\n').find((l) => l.startsWith(`- ${region}:`)) ?? ''
  const read = (index: string): number => {
    const match = line.match(new RegExp(`${index} (\\d+)`))
    return match?.[1] ? Number(match[1]) : 50
  }
  return { population: read('population'), economicVitality: read('economicVitality') }
}

const DRIFT_BANK: ReadonlyArray<{
  nameKind: DraftNameDrift['nameKind']
  attested: string
  drifted: string
  note: string
}> = [
  {
    nameKind: 'toponym',
    attested: 'the old quarter',
    drifted: 'the Printers Quarter',
    note: 'The trade that took the district over took its name with it, and the older one survives only on deeds.',
  },
  {
    nameKind: 'title',
    attested: 'protostrator',
    drifted: 'warden of the roads',
    note: 'The office outlived the court that coined its name, and the clerks translated it into something a carter could follow.',
  },
  {
    nameKind: 'institution',
    attested: 'the chancery',
    drifted: 'the standing office',
    note: 'What began as an emergency committee kept sitting, and kept the plain name it had been given in haste.',
  },
]

/**
 * Demo-mode name drift (v2/M18): rare, tied to a real event in the batch, and
 * naming only. Fires on every third era so the philology lens has something to
 * show without every span turning into a glossary.
 */
function mockNameDrift(args: EraGenerateArgs, events: DraftEvent[], rng: Rng): DraftNameDrift[] {
  if (args.ordinal % 3 !== 1) return []
  const target = events[Math.min(1, events.length - 1)]
  if (!target) return []
  const drift = rng.pick(DRIFT_BANK)
  return [{ ref: target.ref, ...drift }]
}
