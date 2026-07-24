import type { Pressure, PressureKind, PressuresOut } from '@uchronia/schemas'
import type { PressuresArgs } from '../prompts/derive-pressures.js'
import type { Rng } from '../rng.js'

const BANKS: Record<PressureKind, Array<{ name: string; description: (s: string) => string }>> = {
  economic: [
    {
      name: 'Strained treasury',
      description: (s) =>
        `The ledgers of ${s} run on short credit; every initiative competes with the interest bill.`,
    },
    {
      name: 'Route dependence',
      description: (s) =>
        `Too much of what ${s} eats and sells moves along a single corridor that others can tax or close.`,
    },
    {
      name: 'Price memory',
      description: (s) =>
        `Markets around ${s} still price in the last shock; hoarding begins at rumors now.`,
    },
  ],
  demographic: [
    {
      name: 'Thin countryside',
      description: (s) =>
        `The hinterland feeding ${s} has fewer hands than mouths in the capital assume.`,
    },
    {
      name: 'A crowded generation',
      description: (s) =>
        `A large cohort comes of age around ${s} with fewer places than claimants.`,
    },
  ],
  technological: [
    {
      name: 'Technique spillover',
      description: (s) =>
        `A working method has left the workshops that guarded it; ${s} can no longer control who learns it.`,
    },
    {
      name: 'Tooling gap',
      description: (s) => `Rivals of ${s} are re-equipping faster than its own arsenals admit.`,
    },
  ],
  ideological: [
    {
      name: 'Legitimacy arrears',
      description: (s) =>
        `The story ${s} tells about itself has not been updated for the new circumstances; someone will update it first.`,
    },
    {
      name: 'Doctrinal quarrel',
      description: (s) => `A dispute of principle inside ${s} is becoming a dispute of office.`,
    },
  ],
  environmental: [
    {
      name: 'Harvest variance',
      description: (s) =>
        `Two lean years in the districts around ${s} would exhaust the granary math.`,
    },
    {
      name: 'Timber and water',
      description: (s) => `${s} is drawing down forests and channels faster than they renew.`,
    },
  ],
}

const KINDS: PressureKind[] = [
  'economic',
  'demographic',
  'technological',
  'ideological',
  'environmental',
]

/** Deterministic pressures derived from the roster and dial (§4.3, §4.4c). */
export function mockDerivePressures(rawArgs: unknown, rng: Rng): PressuresOut {
  const args = rawArgs as PressuresArgs
  const subject = firstEntityName(args.stateSummary)
  const count = rng.int(3, 5)
  const offset = rng.int(0, KINDS.length - 1)

  const pressures: Pressure[] = []
  for (let i = 0; i < count; i++) {
    const kind = KINDS[(offset + i) % KINDS.length] as PressureKind
    const bank = BANKS[kind]
    const pick = bank[rng.int(0, bank.length - 1)]
    if (!pick) continue
    pressures.push({
      name: pick.name,
      kind,
      description: pick.description(subject),
      intensity: Math.round((0.4 + rng.next() * 0.5) * 100) / 100,
    })
  }

  // §4.4(c): at high railroadness, one pressure pulls toward the record.
  if (args.dial.convergencePressure > 0.55 && args.attractorHints.length > 0) {
    pressures[pressures.length - 1] = {
      name: 'Pull of the old channels',
      kind: 'ideological',
      description: `Structural forces bend this history back toward familiar outcomes; the shape of "${args.attractorHints[0]}" waits at the end of several roads.`,
      intensity: Math.round(args.dial.convergencePressure * 100) / 100,
    }
  }

  return { pressures }
}

function firstEntityName(stateSummary: string): string {
  const match = stateSummary.match(/"([^"]+)"/)
  return match?.[1] ?? 'the realm'
}
