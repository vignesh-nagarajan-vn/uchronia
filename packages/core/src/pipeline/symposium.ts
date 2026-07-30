import type { DraftEvent, Pressure, PressureKind } from '@uchronia/schemas'
import type { DialParams } from '../dial.js'
import type { EraGenerateArgs } from '../prompts/era-generate.js'
import {
  eraSpecialist,
  eraSynthesize,
  SPECIALIST_DOMAINS,
  type SpecialistDomain,
} from '../prompts/symposium.js'
import { callOpts, type PipelineCtx } from './ctx.js'
import { generateStructured } from './structured.js'

/**
 * Symposium derivation (v2/M17): instead of one historian drafting an era,
 * three specialists draft it from their own disciplines and a fourth pass
 * merges them, keeping the disagreements they could not settle as contested
 * marks. Roughly four times the tokens of a standard era, so it is opt-in.
 */

/** How many chairs sit per era. Three is enough to disagree and cheap enough to run. */
export const SYMPOSIUM_CHAIRS = 3

/** The chair best placed to read each kind of pressure. */
const PRESSURE_DOMAIN: Record<PressureKind, SpecialistDomain> = {
  demographic: 'social',
  economic: 'economic',
  technological: 'technological',
  ideological: 'cultural',
  environmental: 'social',
}

/** Pressures at or above this intensity are the ones armies get called to. */
const URGENT = 0.6
/** What an urgent pressure lends the military chair, which has no kind of its own. */
const MILITARY_SHARE = 0.5

/**
 * Pick the three chairs this era actually needs, by summed pressure intensity.
 * No pressure kind maps to the military chair, so it reads the era's overall
 * temperature instead: every urgent tension lends it half its weight, on the
 * principle that a strain pressing hard enough ends up costing somebody an
 * army. A calm era never seats it; a boiling one seats it first.
 * Deterministic, including ties (broken by the fixed domain order).
 */
export function chooseSpecialists(pressures: readonly Pressure[]): SpecialistDomain[] {
  const weight = new Map<SpecialistDomain, number>(SPECIALIST_DOMAINS.map((d) => [d, 0]))
  const add = (domain: SpecialistDomain, amount: number) =>
    weight.set(domain, (weight.get(domain) ?? 0) + amount)
  for (const pressure of pressures) {
    add(PRESSURE_DOMAIN[pressure.kind], pressure.intensity)
    if (pressure.intensity >= URGENT) add('military', pressure.intensity * MILITARY_SHARE)
  }
  return [...weight.entries()]
    .sort(
      (a, b) => b[1] - a[1] || SPECIALIST_DOMAINS.indexOf(a[0]) - SPECIALIST_DOMAINS.indexOf(b[0]),
    )
    .slice(0, SYMPOSIUM_CHAIRS)
    .map(([domain]) => domain)
}

export interface SymposiumEra {
  title: string
  summary: string
  events: DraftEvent[]
  /** Draft ref → the marginal note recording what the chairs could not settle. */
  contested: Map<string, string>
  /** The chairs that sat, in the order they were heard. */
  chairs: SpecialistDomain[]
  /** The synthesizer's model, which is what the era's provenance records. */
  model: string
}

/**
 * Run one era through the symposium: specialist drafts in parallel, then a
 * single synthesis. The specialists are independent by construction, so they
 * fan out; the merge is the only step that needs them all.
 */
export async function deriveEraBySymposium(
  ctx: PipelineCtx,
  args: Omit<EraGenerateArgs, 'subPodStatement'> & {
    subPodStatement: string | null
    dial: DialParams
  },
): Promise<SymposiumEra> {
  const chairs = chooseSpecialists(args.pressures)
  const drafts = await Promise.all(
    chairs.map(async (domain) => {
      const out = await generateStructured(
        ctx.provider,
        eraSpecialist,
        { ...args, domain },
        callOpts(ctx),
      )
      return {
        domain,
        title: out.value.title,
        summary: out.value.summary,
        events: out.value.events as unknown,
      }
    }),
  )

  const synthesized = await generateStructured(
    ctx.provider,
    eraSynthesize,
    {
      podStatement: args.podStatement,
      podMechanism: args.podMechanism,
      span: args.span,
      batchSize: args.batchSize,
      wildcardBudget: args.wildcardBudget,
      stateSummary: args.stateSummary,
      recentEvents: args.recentEvents,
      drafts,
      dial: args.dial,
    },
    callOpts(ctx),
  )

  const known = new Set(synthesized.value.events.map((e) => e.ref))
  const contested = new Map<string, string>()
  for (const mark of synthesized.value.contested) {
    // A contested ref the synthesizer invented has nothing to attach to.
    if (known.has(mark.ref)) contested.set(mark.ref, mark.note)
  }

  return {
    title: synthesized.value.title,
    summary: synthesized.value.summary,
    events: synthesized.value.events,
    contested,
    chairs,
    model: synthesized.model,
  }
}
