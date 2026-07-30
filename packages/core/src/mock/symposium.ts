import type { DraftEvent, EraBatchOut, SymposiumOut } from '@uchronia/schemas'
import {
  type EraSpecialistArgs,
  type EraSynthesizeArgs,
  SPECIALIST_DOMAINS,
  type SpecialistDomain,
} from '../prompts/symposium.js'
import type { Rng } from '../rng.js'
import { mockEraGenerate } from './era.js'

/**
 * Demo-mode symposium (v2/M17): deterministic specialist drafts and a
 * deterministic synthesis with contested marks, so the whole mode is
 * exercisable keyless end to end.
 */

const DOMAIN_INFLECTIONS: Record<SpecialistDomain, string> = {
  military: 'The garrisons feel it first.',
  economic: 'The ledgers feel it first.',
  cultural: 'The sermons and the schoolrooms feel it first.',
  technological: 'The workshops feel it first.',
  social: 'The households feel it first.',
}

export function mockEraSpecialist(rawArgs: unknown, rng: Rng): EraBatchOut {
  const args = rawArgs as EraSpecialistArgs
  const base = mockEraGenerate(rawArgs, rng)
  const keep = Math.max(3, Math.ceil(args.batchSize * 0.7))
  // Each chair starts its reading at a different point in the era, so the
  // three drafts genuinely differ rather than being the same head slice three
  // times over. It also keeps the contingent tail of the era in play for some
  // chair: slicing every draft from the front would quietly hide the shakiest
  // events from the critic, and with them the court.
  const order = Math.max(0, SPECIALIST_DOMAINS.indexOf(args.domain))
  const rotated = [...base.events.slice(order), ...base.events.slice(0, order)]
  return {
    title: `${base.title}, from the ${args.domain} chair`,
    summary: `${DOMAIN_INFLECTIONS[args.domain]} ${base.summary}`,
    events: rotated
      .slice(0, keep)
      .sort((a, b) => a.year - b.year)
      .map((event) => ({
        ...event,
        wildcard: false,
        summary: `${event.summary} (${args.domain} reading)`,
      })),
  }
}

const CONTEST_NOTES = [
  'the economic chair reads this as fiscal exhaustion; the military chair as demobilization managed badly',
  'the cultural chair sees conviction here; the social chair sees a harvest failure wearing a creed',
  'the technological chair calls this diffusion; the economic chair calls it dumping',
  'the military chair credits the commander; the social chair credits the muster rolls',
]

export function mockEraSynthesize(rawArgs: unknown, rng: Rng): SymposiumOut {
  const args = rawArgs as EraSynthesizeArgs
  const pools = args.drafts.map((d) => (Array.isArray(d.events) ? (d.events as DraftEvent[]) : []))
  // Fold the chairs' duplicate tellings of the same event together, then take
  // an even stride across the whole chronological run. Draining the pools from
  // the front instead would leave the era's later years empty and would hide
  // its shakiest material (which the chairs put last) from the critic.
  const seen = new Set<string>()
  const unique: DraftEvent[] = []
  for (const event of pools.flat()) {
    const key = event.title.trim().toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(event)
  }
  unique.sort((a, b) => a.year - b.year)
  const target = Math.max(1, Math.min(args.batchSize, unique.length))
  const merged: DraftEvent[] =
    target >= unique.length
      ? unique
      : [
          ...new Set(
            Array.from({ length: target }, (_, i) =>
              target === 1 ? 0 : Math.round((i * (unique.length - 1)) / (target - 1)),
            ),
          ),
        ]
          .map((i) => unique[i])
          .filter((e): e is DraftEvent => e !== undefined)
  // Relabel refs and remap within-batch causes; causes to dropped drafts fall
  // away (draft resolution treats unknowns as machine-fixable anyway).
  const relabel = new Map<string, string>()
  merged.forEach((event, i) => {
    relabel.set(event.ref, `d${i + 1}`)
  })
  const events = merged.map((event, i) => ({
    ...event,
    ref: `d${i + 1}`,
    causes: event.causes
      .map((cause) =>
        cause.ref.startsWith('d')
          ? relabel.has(cause.ref)
            ? { ...cause, ref: relabel.get(cause.ref) ?? cause.ref }
            : null
          : cause,
      )
      .filter((c): c is DraftEvent['causes'][number] => c !== null),
    wildcard: false,
  }))
  // The dial's wildcard budget claims the most contingent tail events.
  for (let i = 0; i < Math.min(args.wildcardBudget, events.length); i++) {
    const target = events[events.length - 1 - i]
    if (target) target.wildcard = true
  }
  const contestedRef = events[1]?.ref ?? events[0]?.ref
  return {
    title: `The era, as settled by the symposium`,
    summary: `Three chairs argued this span into one account; the marginalia keep what they could not settle.`,
    events,
    contested: contestedRef ? [{ ref: contestedRef, note: rng.pick(CONTEST_NOTES) }] : [],
  }
}
