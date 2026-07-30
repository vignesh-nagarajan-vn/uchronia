import type { InterpretationsOut, SchoolsOut } from '@uchronia/schemas'
import type { InterpretationsArgs, SchoolsArgs } from '../prompts/historiography.js'
import type { Rng } from '../rng.js'
import { regionFlavor } from './flavor.js'

/**
 * Demo-mode historiography (v2/M20). Three canned schools that genuinely
 * disagree, seated in the divergence's own theatre, so a keyless reader sees
 * the same shape of argument a live one would.
 */

const SCHOOLS = [
  {
    name: 'the Ledger School',
    stance:
      'history is what the accounts will bear, and every settlement is legible in what somebody agreed to pay for it',
    blindSpot: 'anything nobody thought worth writing down',
  },
  {
    name: 'the Assembly School',
    stance:
      'history turns on who was in the room and what they were willing to lose, and the rest is weather',
    blindSpot: 'the century of quiet in which the room itself was built',
  },
  {
    name: 'the Parish School',
    stance:
      'the state records the story last, and what actually changed can be read in births, prices, and what people stopped bothering to do',
    blindSpot: 'the decision, taken in an afternoon, that made all of it necessary',
  },
] as const

export function mockHistoriographySchools(rawArgs: unknown, rng: Rng): SchoolsOut {
  const args = rawArgs as SchoolsArgs
  const flavor = regionFlavor(args.region, args.majorEvents[0] ? 1500 : 1500)
  const seats = [
    `the counting house at ${flavor.city}`,
    `the assembly rooms at ${flavor.city}`,
    `the parish registries of the ${flavor.city} hinterland`,
  ]
  // Two or three, deterministically: not every history sustains three schools.
  const count = rng.next() < 0.5 ? 2 : 3
  return {
    schools: SCHOOLS.slice(0, count).map((school, i) => ({
      name: school.name,
      stance: school.stance,
      seat: seats[i] ?? `the academy at ${flavor.city}`,
      blindSpot: school.blindSpot,
    })),
  }
}

const GLOSS_SHAPES = [
  (title: string) =>
    `Read the accounts and "${title}" stops being a decision at all. The money had already moved; what the chronicles record as a choice is the moment somebody finally wrote down an arrangement that had been operating for two seasons. Our rivals want a villain here. We have a ledger, and the ledger balances.`,
  (title: string) =>
    `"${title}" happened because three people in one room preferred it to the alternative in front of them, and the alternative in front of them was not the one posterity imagines. The Ledger School will tell you the money decided. The money was available for either course. Somebody chose.`,
  (title: string) =>
    `The registers show the change arriving in the district a full generation before "${title}" is supposed to have caused it: fewer apprentices bound, more women in the trades, the old feast quietly dropped. What the assembly did that year was ratify a fact. The event is a date the capital gave to something the country had already finished doing.`,
]

export function mockEventInterpretation(rawArgs: unknown, _rng: Rng): InterpretationsOut {
  const args = rawArgs as InterpretationsArgs
  return {
    glosses: args.schools.map((school, i) => ({
      school: school.name,
      gloss: (GLOSS_SHAPES[i] ?? GLOSS_SHAPES[0])?.(args.event.title) ?? args.event.summary,
    })),
  }
}
